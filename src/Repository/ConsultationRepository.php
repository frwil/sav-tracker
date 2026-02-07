<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\Consultation;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bundle\SecurityBundle\Security;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;

/**
 * @extends ServiceEntityRepository<Consultation>
 */
class ConsultationRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private Security $security
    ) {
        parent::__construct($registry, Consultation::class);
    }

    /**
     * Récupère toutes les consultations pour l'utilisateur courant
     * - Admin : voit tout (y compris sans technician)
     * - User : voit seulement ses consultations (technician)
     *   Les consultations sans technician sont invisibles pour les non-admins
     */
    public function findForCurrentUser(): array
    {
        if ($this->isAdmin()) {
            return $this->findAll();
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return [];
        }

        return $this->createQueryBuilder('c')
            ->join('c.technician', 't')  // INNER JOIN exclut les NULL
            ->addSelect('t')
            ->where('t.id = :userId')
            ->setParameter('userId', $user->getId())
            ->getQuery()
            ->getResult();
    }

    /**
     * Crée un QueryBuilder filtré pour l'utilisateur courant
     */
    public function createQueryBuilderForUser(string $alias = 'c'): QueryBuilder
    {
        $qb = $this->createQueryBuilder($alias);

        if ($this->isAdmin()) {
            return $qb;
        }

        $user = $this->security->getUser();
        if ($user instanceof User) {
            $qb->join("$alias.technician", 't')
               ->andWhere('t.id = :userId')
               ->setParameter('userId', $user->getId());
        }

        return $qb;
    }

    /**
     * Récupère une consultation par ID si accessible par l'utilisateur courant
     */
    public function findOneForCurrentUser(int $id): ?Consultation
    {
        if ($this->isAdmin()) {
            return $this->find($id);
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return null;
        }

        return $this->createQueryBuilder('c')
            ->join('c.technician', 't')
            ->where('c.id = :id')
            ->andWhere('t.id = :userId')
            ->setParameter('id', $id)
            ->setParameter('userId', $user->getId())
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function isAdmin(): bool
    {
        return $this->security->isGranted('ROLE_ADMIN') || 
               $this->security->isGranted('ROLE_SUPER_ADMIN') ||
               $this->security->isGranted('ROLE_OPERATOR');
    }
}