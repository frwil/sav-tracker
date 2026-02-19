<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\Visit;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bundle\SecurityBundle\Security;

class VisitRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private Security $security
    ) {
        parent::__construct($registry, Visit::class);
    }

    /**
     * Logique de sécurité centralisée
     */
    private function isAdmin(): bool
    {
        return $this->security->isGranted('ROLE_ADMIN') ||
            $this->security->isGranted('ROLE_SUPER_ADMIN') ||
            $this->security->isGranted('ROLE_OPERATOR');
    }

    /**
     * Applique la restriction de sécurité au QueryBuilder
     */
    private function applySecurity(QueryBuilder $qb, string $alias = 'v'): void
    {
        if (!$this->isAdmin()) {
            $user = $this->security->getUser();
            if ($user instanceof User) {
                $qb->andWhere("$alias.technician = :currentUser")
                    ->setParameter('currentUser', $user);
            }
        }
    }

    /**
     * Recherche paginée avec filtres complexes (Onglets + Périodes)
     */
    public function findVisitsWithPagination(
        string $mode,
        ?string $after,
        ?string $before,
        ?int $customerId,
        int $page = 1,
        int $itemsPerPage = 20,
        ?bool $activated = true
    ): Paginator {
        $qb = $this->createQueryBuilder('v')
            ->leftJoin('v.customer', 'c')->addSelect('c')
            ->leftJoin('v.technician', 't')->addSelect('t');

        $this->applySecurity($qb);

        if ($activated !== null) {
            $qb->andWhere('v.activated = :activated')
                ->setParameter('activated', $activated);

            if (!$activated) {
                $qb->setFirstResult(($page - 1) * $itemsPerPage)
                    ->setMaxResults($itemsPerPage);

                return new Paginator($qb);
            }
        }

        // 1. Gestion des onglets (Modes)
        switch ($mode) {
            case 'planning':
                $qb->andWhere('v.closed = :isClosed')
                    ->andWhere('v.plannedAt IS NOT NULL')
                    ->andWhere('v.visitedAt IS NULL')
                    ->setParameter('isClosed', false) // On lie ici
                    ->orderBy('v.plannedAt', 'ASC');
                $dateField = 'v.plannedAt';
                break;
            case 'in_progress':
                $qb->andWhere('v.closed = :isClosed')
                    ->andWhere('v.visitedAt IS NOT NULL')
                    ->andWhere('v.completedAt IS NULL')
                    ->setParameter('isClosed', false) // On lie ici
                    ->orderBy('v.visitedAt', 'DESC');
                $dateField = 'v.visitedAt';
                break;
            case 'completed':
                $qb->andWhere('v.closed = :isClosed')
                    ->setParameter('isClosed', true) // On lie ici
                    ->orderBy('v.completedAt', 'DESC');
                $dateField = 'v.completedAt';
                break;
            default:
                $dateField = 'v.plannedAt';
        }

        // 2. Gestion de la période
        if ($after) {
            $qb->andWhere("$dateField >= :after")
                ->setParameter('after', new \DateTime($after));
        }
        if ($before) {
            $qb->andWhere("$dateField <= :before")
                ->setParameter('before', new \DateTime($before));
        }

        // 3. Filtre Client
        if ($customerId) {
            $qb->andWhere('v.customer = :customerId')
                ->setParameter('customerId', $customerId);
        }

        // 4. Pagination
        $qb->setFirstResult(($page - 1) * $itemsPerPage)
            ->setMaxResults($itemsPerPage);
        //$query = $qb->getQuery();
        // Affiche le SQL (avec des ? pour les paramètres)
        //dump($mode);
        //dump($query->getSQL());

        // Affiche les paramètres liés (nom, valeur, type)
        //dump($query->getParameters());

        // Arrête l'exécution pour lire les résultats

        //dump($customerId);
        //die();

        return new Paginator($qb);
    }

    /**
     * Récupère une visite par ID si accessible
     */
    public function findOneForCurrentUser(int $id): ?Visit
    {
        $qb = $this->createQueryBuilder('v')
            ->leftJoin('v.customer', 'c')->addSelect('c')
            ->leftJoin('v.technician', 't')->addSelect('t')
            ->andWhere('v.id = :id')
            ->setParameter('id', $id);

        $this->applySecurity($qb);

        return $qb->getQuery()->getOneOrNullResult();
    }

    /**
     * Récupère toutes les visites accessibles (version sans pagination)
     */
    public function findForCurrentUser(): array
    {
        $qb = $this->createQueryBuilder('v')
            ->leftJoin('v.customer', 'c')->addSelect('c')
            ->leftJoin('v.technician', 't')->addSelect('t');

        $this->applySecurity($qb);

        return $qb->getQuery()->getResult();
    }

    /**
     * Statistiques et rapports
     */
    public function findVisitsForStats(array $techIds, \DateTimeInterface $start, \DateTimeInterface $end): array
    {
        $qb = $this->createQueryBuilder('v')
            ->andWhere('
                (v.plannedAt BETWEEN :start AND :end) 
                OR 
                ((v.visitedAt BETWEEN :start AND :end) AND (v.completedAt BETWEEN :start AND :end) AND v.closed=true)
            ')
            ->setParameter('start', $start)
            ->setParameter('end', $end);

        if (!empty($techIds)) {
            $qb->andWhere('v.technician IN (:ids)')
                ->setParameter('ids', $techIds);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Visites "oubliées" (plus de 72h sans clôture)
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
     * Calcule les scores de performance globale (indépendamment du client)
     * @cite 1, 2
     */
    public function getPerformanceStats(?string $after, ?string $before, array $users): array
    {
        if (empty($users)) return [];

        $start = $after ? new \DateTime($after) : new \DateTime('first day of this month');
        $end = $before ? new \DateTime($before) : new \DateTime('last day of this month');

        // 1. Calcul de l'objectif théorique cumulé (DailyRate * Jours travaillés)
        $totalObjective = 0;
        $interval = new \DateInterval('P1D');
        $period = new \DatePeriod($start, $interval, $end->modify('+1 day'));
        foreach ($users as $user) {
        $objectives[] = $user->getObjectives(); // Collection de UserObjective
        }

        foreach ($period as $date) {
            if ($date->format('N') < 7) { // On exclut les dimanches (ISO-8601: 7)
                foreach ($objectives as $obj) {
                    foreach ($obj as $o) {
                        $objStart = $o->getStartDate();
                        $objEnd = $o->getEndDate();

                        $d = $date->format('Y-m-d');
                        if ($d >= $objStart->format('Y-m-d') && ($objEnd === null || $d <= $objEnd->format('Y-m-d'))) {
                            $totalObjective += $o->getDailyRate();
                            break;
                        }
                    }
                }
            }
        }

        // 2. Statistiques des visites (Uniquement non archivées : activated = true)
        $qb = $this->createQueryBuilder('v')
            ->select('
            COUNT(DISTINCT v.id) as total_planned,
            SUM(CASE WHEN v.closed = true AND v.completedAt IS NOT NULL THEN 1 ELSE 0 END) as total_realized
        ')
            ->where('v.technician in (:user)')
            ->andWhere('v.activated = true')
            ->setParameter('user', $users);

        // On compte les planifiées sur la période
        $plannedQb = clone $qb;
        $plannedCount = $plannedQb->andWhere('v.plannedAt BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()->getSingleResult();

        // On compte les réalisées sur la période
        $realizedQb = clone $qb;
        $realizedCount = $realizedQb->andWhere('v.completedAt BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end);
            //dump($realizedQb->getQuery()->getSQL());
            //dump($realizedQb->getParameters());
            //die();
            $realizedCount = $realizedQb->getQuery()->getSingleResult();

        return [
            'objective' => $totalObjective,
            'planned' => (int)$plannedCount['total_planned'],
            'realized' => (int)$realizedCount['total_realized'],
        ];
    }
}
