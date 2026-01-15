<?php 
namespace App\EventListener;

// src/EntityListener/BuildingNamingListener.php
namespace App\EntityListener;

use App\Entity\Building;
use App\Repository\BuildingRepository;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Events;
use Doctrine\Persistence\Event\LifecycleEventArgs;

#[AsEntityListener(event: Events::prePersist, method: 'prePersist', entity: Building::class)]
class BuildingNamingListener
{
    public function __construct(private BuildingRepository $buildingRepository) {}

    public function prePersist(Building $building, LifecycleEventArgs $event): void
    {
        $currentCount = $this->buildingRepository->count([
            'customer' => $building->getCustomer()
        ]);
        
        $building->setName('Bâtiment ' . ($currentCount + 1));
    }
}