<?php

namespace App\State;

use App\ApiResource\TechnicianStats;
use App\Repository\UserRepository;
use App\Repository\VisitRepository;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use Symfony\Component\HttpFoundation\RequestStack;

class TechnicianStatsProvider implements ProviderInterface
{
    public function __construct(
        private VisitRepository $visitRepository,
        private UserRepository $userRepository,
        private RequestStack $requestStack
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $request = $this->requestStack->getCurrentRequest();
        if (!$request) return null;

        // 1. Alignement des filtres de date (Supporte start/end ou after/before pour plus de flexibilité)
        $startStr = $request->query->get('start') ?? $request->query->get('after') ?? (new \DateTime('first day of this month'))->format('Y-m-d');
        $endStr = $request->query->get('end') ?? $request->query->get('before') ?? (new \DateTime('last day of this month'))->format('Y-m-d');

        $start = new \DateTime($startStr . ' 00:00:00');
        $end = new \DateTime($endStr . ' 23:59:59');

        // 2. Techniciens (Supporte technicians[] ou un ID unique)
        $techIdsInput = $request->query->all()['technicians'] ?? [];
        if (is_string($techIdsInput)) $techIdsInput = [$techIdsInput];

        if (empty($techIdsInput)) {
            // Si admin, tous les techs, sinon le provider est limité par le repo ou la sécurité
            $technicians = $this->userRepository->findAll();
            $technicians = array_values(array_filter($technicians, function ($t) {
                return in_array('ROLE_TECHNICIAN', $t->getRoles());
            }));
        } else {
            $technicians = $this->userRepository->findBy(['id' => $techIdsInput]);
        }

        $techIds = array_map(fn($u) => $u->getId(), $technicians);

        // 3. Calcul de l'Objectif Cumulé (Exclut les dimanches)
        $totalObjective = 0;
        foreach ($technicians as $tech) {
            $objectives = $tech->getObjectives();
            $curr = clone $start;
            while ($curr <= $end) {
                if ($curr->format('w') != 0) { // Pas dimanche
                    foreach ($objectives as $obj) {
                        if ($this->isDateInValidityPeriod($curr, $obj->getStartDate(), $obj->getEndDate())) {
                            $totalObjective += $obj->getDailyRate();
                            break;
                        }
                    }
                }
                $curr->modify('+1 day');
            }
        }

        // 4. Récupération des visites via le repository
        // findVisitsForStats est déjà optimisé pour chercher dans l'intervalle [start, end]
        $visits = $this->visitRepository->findVisitsForStats($techIds, $start, $end);

        $stats = new TechnicianStats();
        $this->setIdentityInfo($stats, $technicians);
        $stats->visitsObjective = $totalObjective;

        foreach ($visits as $visit) {
            // CONDITION CRUCIALE : Uniquement visites non archivées
            if (!$visit->isActivated()) continue;

            $isPlanned = $visit->getPlannedAt() !== null;
            $isClosed = $visit->isClosed();
            $completedAt = $visit->getCompletedAt();

            // A. Planifiées (Charge de travail prévue dans la période)
            if ($isPlanned && $this->isDateInRange($visit->getPlannedAt(), $start, $end)) {
                $stats->visitsPlanned++;
            }

            // B. Réalisées (Clôturées ET terminées dans la période)
            if ($isClosed && $completedAt && $this->isDateInRange($completedAt, $start, $end)) {
                $stats->visitsRealized++;

                // C. Adhérence (Ponctualité au jour J)
                if ($isPlanned && $visit->getPlanningDeviation() === 0) {
                    $stats->visitsOnTime++;
                }
            }
        }

        // 5. Calcul des Scores terminaux
        if ($stats->visitsPlanned > 0) {
            $stats->realizationScore = round(($stats->visitsRealized / $stats->visitsPlanned) * 100, 1);
        }
        if ($stats->visitsObjective > 0) {
            $stats->objectiveCompletionScore = round(($stats->visitsRealized / $stats->visitsObjective) * 100, 1);
        }

        //dump($stats,$start,$end);
        //die();

        return $stats;
    }

    private function isDateInValidityPeriod(\DateTimeInterface $target, \DateTimeInterface $start, ?\DateTimeInterface $end): bool
    {
        $t = $target->format('Y-m-d');
        return $t >= $start->format('Y-m-d') && ($end === null || $t <= $end->format('Y-m-d'));
    }

    private function isDateInRange(\DateTimeInterface $date, \DateTimeInterface $start, \DateTimeInterface $end): bool
    {
        return $date >= $start && $date <= $end;
    }

    private function setIdentityInfo(TechnicianStats $stats, array $technicians): void
    {
        if (count($technicians) === 1) {
            $stats->technicianName = $technicians[0]->getFullname();
            $stats->technicianId = $technicians[0]->getId();
        } else {
            $stats->technicianName = count($technicians) . " Techniciens";
        }
    }
}
