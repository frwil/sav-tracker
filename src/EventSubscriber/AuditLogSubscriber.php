<?php

namespace App\EventSubscriber;

use App\Entity\AuditLog;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\OnFlushEventArgs;
use Doctrine\ORM\Events;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Écouteur Doctrine qui intercepte les changements AVANT qu'ils ne soient
 * envoyés à la base de données (onFlush) pour générer des logs.
 */
#[AsDoctrineListener(event: Events::onFlush, priority: 500)]
class AuditLogSubscriber
{
    public function __construct(
        private Security $security
    ) {}

    public function onFlush(OnFlushEventArgs $args): void
    {
        $em = $args->getObjectManager();
        $uow = $em->getUnitOfWork();

        // 1. Détection des CRÉATIONS (Insertions)
        foreach ($uow->getScheduledEntityInsertions() as $entity) {
            $this->logChange($em, $uow, $entity, 'CREATE');
        }

        // 2. Détection des MODIFICATIONS (Mises à jour)
        foreach ($uow->getScheduledEntityUpdates() as $entity) {
            $this->logChange($em, $uow, $entity, 'UPDATE');
        }

        // 3. Détection des SUPPRESSIONS
        foreach ($uow->getScheduledEntityDeletions() as $entity) {
            $this->logChange($em, $uow, $entity, 'DELETE');
        }
    }

    private function logChange($em, $uow, $entity, string $action): void
    {
        // 🛑 SÉCURITÉ CRITIQUE : 
        // On ignore les entités AuditLog pour éviter une boucle infinie
        // (Créer un log -> Déclenche onFlush -> Crée un log -> ...)
        if ($entity instanceof AuditLog) {
            return;
        }

        // --- Construction du Log ---
        $log = new AuditLog();
        $log->setAction($action);
        
        // Récupération propre du nom de la classe (ex: "Customer" au lieu de "App\Entity\Customer")
        try {
            $className = $em->getClassMetadata(get_class($entity))->getName();
            $parts = explode('\\', $className);
            $log->setEntityClass(end($parts)); 
        } catch (\Exception $e) {
            $log->setEntityClass('Unknown');
        }

        // Récupération de l'ID
        // Note: Sur un 'CREATE', l'ID peut être null si auto-incrémenté, c'est normal.
        if (method_exists($entity, 'getId')) {
            $log->setEntityId((string) $entity->getId());
        }

        // Récupération de l'utilisateur courant (Qui fait l'action ?)
        $user = $this->security->getUser();
        if ($user instanceof User) {
            $log->setUsername($user->getUserIdentifier()); // ou $user->getEmail()
        } else {
            $log->setUsername('SYSTEM_OR_ANONYMOUS');
        }

        // Capture des changements (Seulement utile pour UPDATE)
        if ($action === 'UPDATE') {
            $changeset = $uow->getEntityChangeSet($entity);
            $cleanChanges = [];
            
            foreach ($changeset as $field => $values) {
                // On ignore les champs techniques non pertinents
                if (in_array($field, ['createdAt', 'updatedAt', 'password'])) continue;
                
                // Nettoyage des valeurs pour qu'elles soient stockables en JSON
                $cleanChanges[$field] = array_map(function ($v) {
                    if ($v instanceof \DateTimeInterface) return $v->format('Y-m-d H:i:s');
                    if (is_object($v) && method_exists($v, '__toString')) return (string)$v;
                    if (is_object($v)) {
                        // Pour les relations (ex: User), on essaie de prendre l'ID ou le nom court
                        return 'Object(' . (new \ReflectionClass($v))->getShortName() . ')';
                    }
                    return $v;
                }, $values);
            }
            $log->setChanges($cleanChanges);
        }

        // --- ENREGISTREMENT MAGIQUE DANS LA TRANSACTION COURANTE ---
        
        // 1. On dit à l'EntityManager de gérer ce nouvel objet AuditLog
        $em->persist($log);

        // 2. On force le UnitOfWork à calculer ce changement MAINTENANT
        // C'est ce qui permet d'insérer le log dans le MEME flush que l'action utilisateur
        // sans avoir besoin de rappeler $em->flush() (ce qui causerait une erreur).
        $logMetadata = $em->getClassMetadata(AuditLog::class);
        $uow->computeChangeSet($logMetadata, $log);
    }
}