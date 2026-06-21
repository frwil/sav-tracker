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
     * Trouve les visites actives (non closes) créées il y a plus de 72h.
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
     * Récupère toutes les visites pour l'utilisateur courant.
     * - Admin : voit tout
     * - User : voit seulement ses visites (technician)
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

        return $this->createQueryBuilder('v')
            ->where('v.technician = :userId')
            ->setParameter('userId', $user->getId())
            ->getQuery()
            ->getResult();
    }

    /**
     * Récupère une visite par ID si accessible par l'utilisateur courant.
     */
    public function findOneForCurrentUser(int $id): ?Visit
    {
        if ($this->isAdmin()) {
            return $this->find($id);
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return null;
        }

        return $this->createQueryBuilder('v')
            ->where('v.id = :id')
            ->andWhere('v.technician = :userId')
            ->setParameter('id', $id)
            ->setParameter('userId', $user->getId())
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Récupère les visites paginées avec filtres pour le VisitProvider.
     */
    public function findVisitsWithPagination(
        string $mode = 'planning',
        ?string $after = null,
        ?string $before = null,
        ?int $customerId = null,
        int $page = 1,
        int $itemsPerPage = 20,
        ?bool $activated = null
    ): array {
        $qb = $this->createQueryBuilder('v');

        // Filtrage par utilisateur (sauf admin)
        if (!$this->isAdmin()) {
            $user = $this->security->getUser();
            if ($user instanceof User) {
                $qb->andWhere('v.technician = :userId')
                   ->setParameter('userId', $user->getId());
            }
        }

        // Filtre par statut d'activation
        if ($activated !== null) {
            $qb->andWhere('v.activated = :activated')
               ->setParameter('activated', $activated);
        } else {
            // Par défaut, ne montrer que les visites actives
            $qb->andWhere('v.activated = :activated')
               ->setParameter('activated', true);
        }

        // Filtre par mode (planning, in_progress, completed)
        switch ($mode) {
            case 'planning':
                $qb->andWhere('v.closed = :closed')
                   ->andWhere('v.visitedAt IS NULL')
                   ->setParameter('closed', false);
                if ($after) {
                    $qb->andWhere('v.plannedAt >= :after')
                       ->setParameter('after', new \DateTime($after));
                }
                if ($before) {
                    $qb->andWhere('v.plannedAt <= :before')
                       ->setParameter('before', new \DateTime($before));
                }
                $qb->orderBy('v.plannedAt', 'ASC');
                break;

            case 'in_progress':
                $qb->andWhere('v.closed = :closed')
                   ->andWhere('v.visitedAt IS NOT NULL')
                   ->setParameter('closed', false);
                if ($after) {
                    $qb->andWhere('v.visitedAt >= :after')
                       ->setParameter('after', new \DateTime($after));
                }
                if ($before) {
                    $qb->andWhere('v.visitedAt <= :before')
                       ->setParameter('before', new \DateTime($before));
                }
                $qb->orderBy('v.visitedAt', 'DESC');
                break;

            case 'completed':
                $qb->andWhere('v.closed = :closed')
                   ->setParameter('closed', true);
                if ($after) {
                    $qb->andWhere('v.completedAt >= :after')
                       ->setParameter('after', new \DateTime($after));
                }
                if ($before) {
                    $qb->andWhere('v.completedAt <= :before')
                       ->setParameter('before', new \DateTime($before));
                }
                $qb->orderBy('v.completedAt', 'DESC');
                break;

            default:
                $qb->orderBy('v.plannedAt', 'ASC');
        }

        // Filtre par client
        if ($customerId) {
            $qb->andWhere('v.customer = :customerId')
               ->setParameter('customerId', $customerId);
        }

        // Pagination
        $offset = ($page - 1) * $itemsPerPage;
        $qb->setFirstResult($offset)
           ->setMaxResults($itemsPerPage);

        return $qb->getQuery()->getResult();
    }

    /**
     * Trouve les visites pour les statistiques (utilisé par TechnicianStatsProvider).
     * Retourne les visites des techniciens spécifiés dans l'intervalle de dates.
     *
     * @param int[] $techIds
     */
    public function findVisitsForStats(array $techIds, \DateTimeInterface $start, \DateTimeInterface $end): array
    {
        if (empty($techIds)) {
            return [];
        }

        return $this->createQueryBuilder('v')
            ->where('v.technician IN (:techIds)')
            ->andWhere('v.visitedAt >= :start')
            ->andWhere('v.visitedAt <= :end')
            ->setParameter('techIds', $techIds)
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getResult();
    }

    private function isAdmin(): bool
    {
        return $this->security->isGranted('ROLE_ADMIN') ||
               $this->security->isGranted('ROLE_SUPER_ADMIN');
    }
}
