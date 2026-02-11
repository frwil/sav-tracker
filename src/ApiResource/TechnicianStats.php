<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\TechnicianStatsProvider;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/stats/adherence', 
            provider: TechnicianStatsProvider::class,
            name: 'get_adherence_stats'
        )
    ],
    normalizationContext: ['groups' => ['stats:read']]
)]
class TechnicianStats
{
    #[Groups(['stats:read'])]
    public ?int $technicianId = null;

    #[Groups(['stats:read'])]
    public ?string $technicianName = null;

    // --- Objectifs ---
    #[Groups(['stats:read'])]
    public int $dailyRate = 0; // Objectif journalier moyen

    #[Groups(['stats:read'])]
    public int $visitsObjective = 0; // Objectif total sur la période (Théorique)

    // --- Volumétrie ---
    #[Groups(['stats:read'])]
    public int $visitsPlanned = 0;   // Agenda (Charge prévue)

    #[Groups(['stats:read'])]
    public int $visitsRealized = 0;  // Terrain (Productivité réelle)

    #[Groups(['stats:read'])]
    public int $visitsOnTime = 0;    // Ponctualité

    // --- Scores (%) ---
    #[Groups(['stats:read'])]
    public float $adherenceScore = 0.0; // Respect du planning (Ponctualité)

    #[Groups(['stats:read'])]
    public float $realizationScore = 0.0; // Réalisé vs Planifié (Productivité Agenda)

    #[Groups(['stats:read'])]
    public float $objectiveCompletionScore = 0.0; // Réalisé vs Objectif Contrat (Performance)
}