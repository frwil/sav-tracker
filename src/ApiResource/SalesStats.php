<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\SalesStatsProvider;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/stats/sales',
            provider: SalesStatsProvider::class,
            name: 'get_sales_stats'
        )
    ],
    normalizationContext: ['groups' => ['sales_stats:read']]
)]
class SalesStats
{
    #[Groups(['sales_stats:read'])]
    public ?int $salesRepId = null;

    #[Groups(['sales_stats:read'])]
    public ?string $salesRepName = null;

    // ─── Visites ───

    #[Groups(['sales_stats:read'])]
    public int $visitsPlanned = 0;

    #[Groups(['sales_stats:read'])]
    public int $visitsRealized = 0;

    #[Groups(['sales_stats:read'])]
    public int $visitsOnTime = 0; // JP Adherence (jour J)

    // ─── Scores (%) ───

    #[Groups(['sales_stats:read'])]
    public float $jpAdherence = 0.0; // % visites faites le jour prévu

    #[Groups(['sales_stats:read'])]
    public float $callRate = 0.0; // % réalisé vs planifié

    // ─── Commandes ───

    #[Groups(['sales_stats:read'])]
    public int $preOrdersTaken = 0;

    #[Groups(['sales_stats:read'])]
    public int $ordersWon = 0; // livrées

    #[Groups(['sales_stats:read'])]
    public float $strikeRate = 0.0; // % commandes gagnées

    #[Groups(['sales_stats:read'])]
    public float $totalRevenue = 0.0; // CA total

    #[Groups(['sales_stats:read'])]
    public float $avgOrderValue = 0.0; // panier moyen

    // ─── Prix ───

    #[Groups(['sales_stats:read'])]
    public int $priceChecksDone = 0;

    #[Groups(['sales_stats:read'])]
    public int $priceCompliant = 0;

    #[Groups(['sales_stats:read'])]
    public float $priceCompliance = 0.0; // % prix conformes

    // ─── Assortiment & Stock ───

    #[Groups(['sales_stats:read'])]
    public int $stockChecksDone = 0;

    #[Groups(['sales_stats:read'])]
    public int $mustStockPresent = 0;

    #[Groups(['sales_stats:read'])]
    public int $outOfStockCount = 0;

    #[Groups(['sales_stats:read'])]
    public float $mustStockRate = 0.0; // % must-stock présents

    #[Groups(['sales_stats:read'])]
    public float $oosRate = 0.0; // % ruptures

    #[Groups(['sales_stats:read'])]
    public float $avgFreshness = 0.0; // score fraîcheur moyen (1-5)

    // ─── Qualité & Visibilité ───

    #[Groups(['sales_stats:read'])]
    public float $avgQualityScore = 0.0; // score qualité moyen (1-5)

    #[Groups(['sales_stats:read'])]
    public float $avgVisibilityScore = 0.0; // score visibilité moyen (1-5)

    // ─── Exécution ───

    #[Groups(['sales_stats:read'])]
    public int $activitiesTotal = 0;

    #[Groups(['sales_stats:read'])]
    public int $activitiesCompleted = 0;

    #[Groups(['sales_stats:read'])]
    public float $executionRate = 0.0; // % activités complétées
}
