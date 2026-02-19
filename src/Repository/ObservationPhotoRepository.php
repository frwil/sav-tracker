<?php

namespace App\Repository;

use App\Entity\ObservationPhoto;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ObservationPhoto>
 */
class ObservationPhotoRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ObservationPhoto::class);
    }

    /**
     * Récupère les photos liées à une visite spécifique
     */
    public function findByVisit(int $visitId): array
    {
        return $this->createQueryBuilder('p')
            ->andWhere('p.visit = :val')
            ->setParameter('val', $visitId)
            ->orderBy('p.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Récupère les photos liées à une observation
     */
    public function findByObservation(int $observationId): array
    {
        return $this->createQueryBuilder('p')
            ->andWhere('p.observation = :val')
            ->setParameter('val', $observationId)
            ->getQuery()
            ->getResult();
    }
}