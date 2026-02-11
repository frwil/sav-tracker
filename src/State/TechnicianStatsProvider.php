<?php

namespace App\State;

use App\ApiResource\TechnicianStats;
use App\Entity\User;
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
        
        // 1. Période (Défaut : Mois en cours)
        $startStr = $request->query->get('start', (new \DateTime('first day of this month'))->format('Y-m-d'));
        $endStr = $request->query->get('end', (new \DateTime('last day of this month'))->format('Y-m-d'));
        
        $start = new \DateTime($startStr . ' 00:00:00');
        $end = new \DateTime($endStr . ' 23:59:59');

        // 2. Techniciens concernés
        // Récupération via ?technicians[]=1&technicians[]=2
        $techIdsInput = $request->query->all()['technicians'] ?? [];
        
        if (empty($techIdsInput)) {
            $technicians = $this->userRepository->findAll(); 
            $technicians = array_values(array_filter($technicians,function($t){
                return in_array('ROLE_TECHNICIAN',$t->getRoles());
            }));
        } else {
            $technicians = $this->userRepository->findBy(['id' => $techIdsInput]);
        }

        // On extrait les IDs pour la requête SQL des visites
        $techIds = array_map(fn($u) => $u->getId(), $technicians);

        // 3. Calcul de l'Objectif Théorique (HISTORISÉ)
        // On doit additionner l'objectif de chaque jour pour chaque technicien,
        // en tenant compte des variations d'objectifs dans le temps.
        $totalObjective = 0;
        $currentDailyRateSum = 0; // Pour l'affichage (valeur indicative actuelle)

        foreach ($technicians as $tech) {
            // Récupération des objectifs historiques (Collection UserObjective)
            $objectives = $tech->getObjectives(); 

            // On prend le dernier objectif connu pour l'info "Taux actuel"
            if (!$objectives->isEmpty()) {
                $lastObj = $objectives->last(); // Suppose que la collection est ordonnée ou naturelle
                $currentDailyRateSum += $lastObj->getDailyRate();
            }

            // Boucle sur chaque jour de la période demandée
            $curr = \DateTime::createFromInterface($start);
            $endCmp = \DateTime::createFromInterface($end);

            while ($curr <= $endCmp) {
                // Si c'est un jour ouvré (Exclut le Dimanche '0')
                if ($curr->format('w') != 0) {
                    
                    // On cherche l'objectif qui était actif à cette date précise ($curr)
                    $activeRate = 0;
                    foreach ($objectives as $obj) {
                        // Vérifie si $curr est dans la plage [startDate, endDate] de l'objectif
                        if ($this->isDateInValidityPeriod($curr, $obj->getStartDate(), $obj->getEndDate())) {
                            $activeRate = $obj->getDailyRate();
                            break; // On a trouvé l'objectif pour ce jour, on arrête de chercher
                        }
                    }
                    $totalObjective += $activeRate;
                }
                $curr->modify('+1 day');
            }
        }

        // 4. Récupération des visites réelles
        $visits = $this->visitRepository->findVisitsForStats($techIds, $start, $end);

        // 5. Construction de l'objet de réponse (DTO)
        $stats = new TechnicianStats();
        $this->setIdentityInfo($stats, $technicians);
        
        $stats->visitsObjective = $totalObjective;
        
        // Si on regarde un seul tech, on voit son taux actuel. Si plusieurs, c'est la somme (indicatif).
        $stats->dailyRate = count($technicians) > 0 ? $currentDailyRateSum : 0;

        foreach ($visits as $visit) {
            $isPlanned = $visit->getPlannedAt() !== null;
            $isRealized = $visit->getVisitedAt() !== null;

            // A. Analyse Planification
            if ($isPlanned && $this->isDateInRange($visit->getPlannedAt(), $start, $end)) {
                $stats->visitsPlanned++;
            }

            // B. Analyse Réalisation
            if ($isRealized && $this->isDateInRange($visit->getVisitedAt(), $start, $end)) {
                $stats->visitsRealized++;
            }

            // C. Analyse Adhérence
            // Visite prévue ET réalisée le jour même
            if ($isPlanned && $isRealized) {
                if ($visit->getPlanningDeviation() === 0) {
                    $stats->visitsOnTime++;
                }
            }
        }

        // 6. Calcul des pourcentages
        if ($stats->visitsPlanned > 0) {
            $stats->adherenceScore = round(($stats->visitsOnTime / $stats->visitsPlanned) * 100, 1);
            $stats->realizationScore = round(($stats->visitsRealized / $stats->visitsPlanned) * 100, 1);
        }

        if ($stats->visitsObjective > 0) {
            $stats->objectiveCompletionScore = round(($stats->visitsRealized / $stats->visitsObjective) * 100, 1);
        }

        return $stats;
    }

    /**
     * Vérifie si une date cible est incluse dans une période de validité (bornes incluses)
     * Gère le cas où endDate est null (valide indéfiniment)
     */
    private function isDateInValidityPeriod(\DateTimeInterface $target, \DateTimeInterface $start, ?\DateTimeInterface $end): bool
    {
        // On normalise les dates à minuit pour comparer des jours
        $targetDay = $target->format('Y-m-d');
        $startDay = $start->format('Y-m-d');
        
        if ($targetDay < $startDay) {
            return false;
        }

        if ($end !== null) {
            $endDay = $end->format('Y-m-d');
            if ($targetDay > $endDay) {
                return false;
            }
        }

        return true;
    }

    private function isDateInRange(\DateTimeInterface $date, \DateTimeInterface $start, \DateTimeInterface $end): bool
    {
        return $date >= $start && $date <= $end;
    }

    private function setIdentityInfo(TechnicianStats $stats, array $technicians): void
    {
        if (count($technicians) === 1) {
            $stats->technicianName = $technicians[0]->getUsername(); // ou getFirstName()
            $stats->technicianId = $technicians[0]->getId();
        } else {
            $stats->technicianName = "Groupe sélectionné (" . count($technicians) . " techs)";
            $stats->technicianId = null;
        }
    }
}