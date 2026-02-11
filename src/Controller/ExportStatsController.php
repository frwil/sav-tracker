<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Repository\VisitRepository;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

#[IsGranted('ROLE_ADMIN')] // Sécurisation
class ExportStatsController extends AbstractController
{
    public function __construct(
        private VisitRepository $visitRepository,
        private UserRepository $userRepository
    ) {}

    #[Route('/api/stats/export/excel', name: 'api_stats_export_excel', methods: ['GET'])]
    public function export(Request $request): StreamedResponse
    {
        // 1. Récupération des filtres
        $startStr = $request->query->get('start', (new \DateTime('first day of this month'))->format('Y-m-d'));
        $endStr = $request->query->get('end', (new \DateTime('last day of this month'))->format('Y-m-d'));
        $techIdsInput = $request->query->all()['technicians'] ?? [];

        $start = new \DateTime($startStr . ' 00:00:00');
        $end = new \DateTime($endStr . ' 23:59:59');

        // 2. Sélection des techniciens
        if (empty($techIdsInput)) {
            // Idéalement filtrer par rôle, ici on prend tout pour simplifier
            $technicians = $this->userRepository->findAll();
            // Filtre basique PHP si besoin :
            $technicians = array_filter($technicians, fn(User $u) => in_array('ROLE_TECHNICIAN', $u->getRoles()));
        } else {
            $technicians = $this->userRepository->findBy(['id' => $techIdsInput]);
        }

        // 3. Préparation du fichier Excel
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Performance Techniciens');

        // En-têtes (Ligne 1)
        $headers = [
            'Technicien',
            'Objectifs visites totales',
            'Nbr visites planifiées',
            'Nbr planifiées réalisées',
            'Nbr non planifiées réalisées', // Spontanées
            'Nbr visites totales', // (Planifiées réalisées + Non planifiées)
            'Nbr planifiées réalisées le jour exact',
            '% Réalisation Planifié', // (Planifiées réalisées / Planifiées)
            '% Adhérence Jour J' // (Fait jour J / Planifiées)
        ];
        
        // Style En-tête
        $sheet->fromArray($headers, NULL, 'A1');
        $sheet->getStyle('A1:I1')->getFont()->setBold(true);
        $sheet->getStyle('A1:I1')->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setARGB('FFEEEEEE');

        // 4. Boucle sur chaque technicien (Ligne par ligne)
        $row = 2;
        foreach ($technicians as $tech) {
            
            // --- A. Calcul de l'Objectif (Logique Historique) ---
            $objectiveTotal = $this->calculateObjective($tech, $start, $end);

            // --- B. Récupération des visites ---
            // On récupère toutes les visites du tech sur la période (Planifiées OU Réalisées)
            $visits = $this->visitRepository->findVisitsForStats([$tech->getId()], $start, $end);

            // --- C. Calcul des KPIs ---
            $nbPlanified = 0;
            $nbPlanifiedDone = 0;
            $nbSpontaneousDone = 0;
            $nbOnTime = 0;

            foreach ($visits as $visit) {
                $isPlanned = $visit->getPlannedAt() !== null;
                $isRealized = $visit->getVisitedAt() !== null;

                // 1. Est-ce planifié DANS la période ?
                if ($isPlanned && $this->isDateInRange($visit->getPlannedAt(), $start, $end)) {
                    $nbPlanified++;
                    
                    // 2. Est-ce que cette planif a été réalisée (peu importe quand) ?
                    if ($isRealized) {
                        $nbPlanifiedDone++;

                        // 3. Est-ce réalisé le jour exact ?
                        if ($visit->getPlanningDeviation() === 0) {
                            $nbOnTime++;
                        }
                    }
                }

                // 4. Est-ce une visite Spontanée (Non planifiée) réalisée DANS la période ?
                // Note : Si c'est planifié hors période mais réalisé dans la période, ça compte comme spontané/rattrapage ici ?
                // Selon votre demande : "Non planifiées réalisées". 
                // Strictement : plannedAt IS NULL et visitedAt IN PERIOD.
                if (!$isPlanned && $isRealized && $this->isDateInRange($visit->getVisitedAt(), $start, $end)) {
                    $nbSpontaneousDone++;
                }
            }

            $nbTotalDone = $nbPlanifiedDone + $nbSpontaneousDone;

            // --- D. Calcul des Pourcentages ---
            $percentRealization = $nbPlanified > 0 ? round(($nbPlanifiedDone / $nbPlanified) * 100, 2) : 0;
            $percentAdherence = $nbPlanified > 0 ? round(($nbOnTime / $nbPlanified) * 100, 2) : 0;

            // --- E. Écriture de la ligne ---
            $sheet->setCellValue('A' . $row, $tech->getUsername());
            $sheet->setCellValue('B' . $row, $objectiveTotal);
            $sheet->setCellValue('C' . $row, $nbPlanified);
            $sheet->setCellValue('D' . $row, $nbPlanifiedDone);
            $sheet->setCellValue('E' . $row, $nbSpontaneousDone);
            $sheet->setCellValue('F' . $row, $nbTotalDone);
            $sheet->setCellValue('G' . $row, $nbOnTime);
            $sheet->setCellValue('H' . $row, $percentRealization . '%');
            $sheet->setCellValue('I' . $row, $percentAdherence . '%');

            $row++;
        }

        // Auto-dimensionnement des colonnes
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // 5. Génération de la réponse (Stream)
        $writer = new Xlsx($spreadsheet);
        $response = new StreamedResponse(function () use ($writer) {
            $writer->save('php://output');
        });

        $filename = 'export_performance_' . date('Y-m-d') . '.xlsx';
        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment;filename="' . $filename . '"');
        $response->headers->set('Cache-Control', 'max-age=0');

        return $response;
    }

    // --- Helpers (Dupliqués du Provider pour isolation) ---

    private function calculateObjective(User $tech, \DateTimeInterface $start, \DateTimeInterface $end): int
    {
        $total = 0;
        $curr = \DateTime::createFromInterface($start);
        $endCmp = \DateTime::createFromInterface($end);
        $objectives = $tech->getObjectives();

        while ($curr <= $endCmp) {
            if ($curr->format('w') != 0) { // Pas dimanche
                foreach ($objectives as $obj) {
                    if ($this->isDateInValidityPeriod($curr, $obj->getStartDate(), $obj->getEndDate())) {
                        $total += $obj->getDailyRate();
                        break;
                    }
                }
            }
            $curr->modify('+1 day');
        }
        return $total;
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
}