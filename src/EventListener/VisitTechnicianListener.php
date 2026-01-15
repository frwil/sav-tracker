<?php

namespace App\EntityListener;

use App\Entity\Visit;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;
use Symfony\Bundle\SecurityBundle\Security;

#[AsEntityListener(event: Events::prePersist, method: 'prePersist', entity: Visit::class)]
class VisitTechnicianListener
{
    public function __construct(private Security $security) {}

    public function prePersist(Visit $visit, LifecycleEventArgs $event): void
    {
        // Si le technicien n'est pas déjà défini, on met l'utilisateur actuel
        if ($visit->getTechnician() === null) {
            $user = $this->security->getUser();
            if ($user instanceof User) {
                $visit->setTechnician($user);
            }
        }
    }
}