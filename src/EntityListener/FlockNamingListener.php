<?php 
// src/EntityListener/FlockNamingListener.php
namespace App\EntityListener;

use App\Entity\Flock;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;

#[AsEntityListener(event: Events::prePersist, method: 'prePersist', entity: Flock::class)]
class FlockNamingListener
{
    public function prePersist(Flock $flock, LifecycleEventArgs $event): void
    {
        $customerCode = $flock->getBuilding()->getCustomer()->getCode() ?? 'CLI';
        $buildingName = str_replace(' ', '', $flock->getBuilding()->getName());
        $date = $flock->getStartDate() ? $flock->getStartDate()->format('dmY') : date('dmY');

        $flock->setName(sprintf('%s-%s-%s', $customerCode, $buildingName, $date));
    }
}