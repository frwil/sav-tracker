<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\Visit;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bundle\SecurityBundle\Security;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;

class VisitRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private Security $security
    ) {
        parent::__construct($registry, Visit::class);
    }

    /**
     * Trouve les visites actives (non closes) créées il y a plus de 72h
     * @return Visit[]
     */
    public function findExpiredVisits(): array
    {
        $threshold = new \DateTime('-72 hours');

        return $this->createQueryBuilder('v')
            ->andWhere('v.closed = :isClosed')
            ->andWhere('v.activated = :isActivated')
            ->andWhere('v.visitedAt <= :threshold')
            ->setParameter('isClosed', false)
            ->setParameter('isActivated', true)
            ->setParameter('threshold', $threshold)
            ->getQuery()
            ->getResult();
    }

    /**
     * Récupère toutes les visites pour l'utilisateur courant
     * - Admin : voit tout
     * - User : voit seulement ses visites (technician)
     */
    public function findForCurrentUser(): array
    {
        $qb = $this->createQueryBuilder('v')
            ->leftJoin('v.customer', 'c')      // ✅ Jointure explicite
            ->addSelect('c')                   // ✅ Sélection explicite
            ->leftJoin('v.technician', 't')    // ✅ Jointure explicite
            ->addSelect('t');                  // ✅ Sélection explicite

        if ($this->isAdmin()) {
            return $qb->getQuery()->getResult();
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return [];
        }
        return $qb
            ->where('t.id = :userId')
            ->setParameter('userId', $user->getId())
            ->getQuery()
            ->getResult();
    }

    /**
     * Crée un QueryBuilder filtré pour l'utilisateur courant
     */
    public function createQueryBuilderForUser(string $alias = 'v'): QueryBuilder
    {
        $qb = $this->createQueryBuilder($alias)
            ->leftJoin("$alias.customer", 'c')
            ->addSelect('c')
            ->leftJoin("$alias.technician", 't')
            ->addSelect('t');

        if ($this->isAdmin()) {
            return $qb;
        }

        $user = $this->security->getUser();
        if ($user instanceof User) {
            $qb->andWhere('t.id = :userId')
               ->setParameter('userId', $user->getId());
        }

        return $qb;
    }

    /**
     * Récupère une visite par ID si accessible par l'utilisateur courant
     */
    public function findOneForCurrentUser(int $id): ?Visit
    {
        $qb = $this->createQueryBuilder('v')
            ->leftJoin('v.customer', 'c')
            ->addSelect('c')
            ->leftJoin('v.technician', 't')
            ->addSelect('t')
            ->where('v.id = :id')
            ->setParameter('id', $id);

        if ($this->isAdmin()) {
            return $qb->getQuery()->getOneOrNullResult();
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return null;
        }

        return $qb
            ->andWhere('t.id = :userId')
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