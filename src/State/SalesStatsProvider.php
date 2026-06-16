<?php

namespace App\State;

use App\ApiResource\SalesStats;
use App\Repository\UserRepository;
use Doctrine\DBAL\Connection;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use Symfony\Component\HttpFoundation\RequestStack;

class SalesStatsProvider implements ProviderInterface
{
    public function __construct(
        private Connection $connection,
        private UserRepository $userRepository,
        private RequestStack $requestStack
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $request = $this->requestStack->getCurrentRequest();
        if (!$request) return null;

        // 1. Filtres de date
        $startStr = $request->query->get('start')
            ?? $request->query->get('after')
            ?? (new \DateTime('first day of this month'))->format('Y-m-d');
        $endStr = $request->query->get('end')
            ?? $request->query->get('before')
            ?? (new \DateTime('last day of this month'))->format('Y-m-d');

        $start = $startStr . ' 00:00:00';
        $end = $endStr . ' 23:59:59';

        // 2. Sélection des commerciaux
        $repIdsInput = $request->query->all()['sales_reps'] ?? [];
        if (is_string($repIdsInput)) $repIdsInput = [$repIdsInput];

        if (empty($repIdsInput)) {
            $allReps = $this->userRepository->findAll();
            $reps = array_values(array_filter($allReps, fn($u) => in_array('ROLE_SALES_REP', $u->getRoles())));
        } else {
            $reps = $this->userRepository->findBy(['id' => $repIdsInput]);
            // Filtrer pour ne garder que les commerciaux
            $reps = array_values(array_filter($reps, fn($u) => in_array('ROLE_SALES_REP', $u->getRoles())));
        }

        if (empty($reps)) return null;

        $repIds = array_map(fn($u) => $u->getId(), $reps);
        $repIdsStr = implode(',', $repIds);

        // Si un seul commercial → stats individuelles, sinon → agrégées
        $result = count($reps) === 1
            ? $this->buildSingleRepStats($reps[0], $start, $end)
            : $this->buildAggregatedStats($reps, $repIdsStr, $start, $end);

        return $result;
    }

    private function buildSingleRepStats($rep, string $start, string $end): SalesStats
    {
        $s = new SalesStats();
        $s->salesRepId = $rep->getId();
        $s->salesRepName = $rep->getFullname();

        $repId = $rep->getId();

        // ─── Visites ───
        $s->visitsPlanned = (int) $this->queryScalar(
            "SELECT COUNT(*) FROM sales_visit WHERE sales_rep_id = ? AND planned_at BETWEEN ? AND ? AND activated = 1",
            [$repId, $start, $end]
        );
        $s->visitsRealized = (int) $this->queryScalar(
            "SELECT COUNT(*) FROM sales_visit WHERE sales_rep_id = ? AND visited_at BETWEEN ? AND ? AND closed = 1 AND activated = 1",
            [$repId, $start, $end]
        );
        $s->visitsOnTime = (int) $this->queryScalar(
            "SELECT COUNT(*) FROM sales_visit WHERE sales_rep_id = ? AND closed = 1 AND activated = 1 AND visited_at BETWEEN ? AND ? AND DATE(visited_at) = DATE(planned_at)",
            [$repId, $start, $end]
        );

        // JP Adherence
        if ($s->visitsRealized > 0) {
            $s->jpAdherence = round(($s->visitsOnTime / $s->visitsRealized) * 100, 1);
        }
        // Call Rate
        if ($s->visitsPlanned > 0) {
            $s->callRate = round(($s->visitsRealized / $s->visitsPlanned) * 100, 1);
        }

        // ─── Commandes ───
        $poData = $this->queryRow(
            "SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as won,
                    COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN total_value ELSE 0 END), 0) as revenue
             FROM pre_order
             WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id = ? AND closed = 1 AND visited_at BETWEEN ? AND ?)",
            [$repId, $start, $end]
        );
        $s->preOrdersTaken = (int) ($poData['total'] ?? 0);
        $s->ordersWon = (int) ($poData['won'] ?? 0);
        $s->totalRevenue = (float) ($poData['revenue'] ?? 0);

        if ($s->preOrdersTaken > 0) {
            $s->strikeRate = round(($s->ordersWon / $s->preOrdersTaken) * 100, 1);
        }
        if ($s->ordersWon > 0) {
            $s->avgOrderValue = round($s->totalRevenue / $s->ordersWon, 0);
        }

        // ─── Prix ───
        $priceData = $this->queryRow(
            "SELECT COUNT(*) as total, COUNT(CASE WHEN price_compliance = 1 THEN 1 END) as compliant
             FROM price_audit
             WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id = ? AND closed = 1 AND visited_at BETWEEN ? AND ?)",
            [$repId, $start, $end]
        );
        $s->priceChecksDone = (int) ($priceData['total'] ?? 0);
        $s->priceCompliant = (int) ($priceData['compliant'] ?? 0);
        if ($s->priceChecksDone > 0) {
            $s->priceCompliance = round(($s->priceCompliant / $s->priceChecksDone) * 100, 1);
        }

        // ─── Stock ───
        $stockData = $this->queryRow(
            "SELECT COUNT(*) as total,
                    COUNT(CASE WHEN is_must_stock = 1 THEN 1 END) as must_total,
                    COUNT(CASE WHEN is_must_stock = 1 AND is_out_of_stock = 0 THEN 1 END) as must_present,
                    COUNT(CASE WHEN is_out_of_stock = 1 THEN 1 END) as oos,
                    AVG(freshness_score) as avg_fresh
             FROM stock_audit
             WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id = ? AND closed = 1 AND visited_at BETWEEN ? AND ?)",
            [$repId, $start, $end]
        );
        $s->stockChecksDone = (int) ($stockData['total'] ?? 0);
        $mustTotal = (int) ($stockData['must_total'] ?? 0);
        $s->mustStockPresent = (int) ($stockData['must_present'] ?? 0);
        $s->outOfStockCount = (int) ($stockData['oos'] ?? 0);
        $s->avgFreshness = round((float) ($stockData['avg_fresh'] ?? 0), 1);

        if ($mustTotal > 0) {
            $s->mustStockRate = round(($s->mustStockPresent / $mustTotal) * 100, 1);
        }
        if ($s->stockChecksDone > 0) {
            $s->oosRate = round(($s->outOfStockCount / $s->stockChecksDone) * 100, 1);
        }

        // ─── Qualité ───
        $qualData = $this->queryRow(
            "SELECT AVG(overall_quality_score) as avg_q
             FROM quality_audit
             WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id = ? AND closed = 1 AND visited_at BETWEEN ? AND ?)",
            [$repId, $start, $end]
        );
        $s->avgQualityScore = round((float) ($qualData['avg_q'] ?? 0), 1);

        // ─── Visibilité ───
        $visData = $this->queryRow(
            "SELECT AVG(overall_visibility_score) as avg_v
             FROM visibility_audit
             WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id = ? AND closed = 1 AND visited_at BETWEEN ? AND ?)",
            [$repId, $start, $end]
        );
        $s->avgVisibilityScore = round((float) ($visData['avg_v'] ?? 0), 1);

        // ─── Exécution ───
        $execData = $this->queryRow(
            "SELECT COUNT(*) as total, COUNT(CASE WHEN is_completed = 1 THEN 1 END) as done
             FROM sales_activity
             WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id = ? AND closed = 1 AND visited_at BETWEEN ? AND ?)",
            [$repId, $start, $end]
        );
        $s->activitiesTotal = (int) ($execData['total'] ?? 0);
        $s->activitiesCompleted = (int) ($execData['done'] ?? 0);
        if ($s->activitiesTotal > 0) {
            $s->executionRate = round(($s->activitiesCompleted / $s->activitiesTotal) * 100, 1);
        }

        // Perfect Store Score (moyenne pondérée)
        $s->perfectStoreScore = $this->computePerfectStoreScore($s);

        return $s;
    }

    private function buildAggregatedStats(array $reps, string $repIdsStr, string $start, string $end): SalesStats
    {
        $s = new SalesStats();
        $s->salesRepName = count($reps) . ' Commerciaux';

        // ─── Visites (agrégées) ───
        $s->visitsPlanned = (int) $this->queryScalar(
            "SELECT COUNT(*) FROM sales_visit WHERE sales_rep_id IN ($repIdsStr) AND planned_at BETWEEN '$start' AND '$end' AND activated = 1"
        );
        $s->visitsRealized = (int) $this->queryScalar(
            "SELECT COUNT(*) FROM sales_visit WHERE sales_rep_id IN ($repIdsStr) AND visited_at BETWEEN '$start' AND '$end' AND closed = 1 AND activated = 1"
        );
        $s->visitsOnTime = (int) $this->queryScalar(
            "SELECT COUNT(*) FROM sales_visit WHERE sales_rep_id IN ($repIdsStr) AND closed = 1 AND activated = 1 AND visited_at BETWEEN '$start' AND '$end' AND DATE(visited_at) = DATE(planned_at)"
        );

        if ($s->visitsRealized > 0) $s->jpAdherence = round(($s->visitsOnTime / $s->visitsRealized) * 100, 1);
        if ($s->visitsPlanned > 0) $s->callRate = round(($s->visitsRealized / $s->visitsPlanned) * 100, 1);

        // ─── Commandes ───
        $pod = $this->queryRow(
            "SELECT COUNT(*) as t, COUNT(CASE WHEN status='DELIVERED' THEN 1 END) as w, COALESCE(SUM(CASE WHEN status='DELIVERED' THEN total_value END),0) as rev
             FROM pre_order WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id IN ($repIdsStr) AND closed=1 AND visited_at BETWEEN '$start' AND '$end')"
        );
        $s->preOrdersTaken = (int)($pod['t']??0);
        $s->ordersWon = (int)($pod['w']??0);
        $s->totalRevenue = (float)($pod['rev']??0);
        if ($s->preOrdersTaken > 0) $s->strikeRate = round(($s->ordersWon / $s->preOrdersTaken) * 100, 1);
        if ($s->ordersWon > 0) $s->avgOrderValue = round($s->totalRevenue / $s->ordersWon, 0);

        // ─── Prix ───
        $prd = $this->queryRow(
            "SELECT COUNT(*) as t, COUNT(CASE WHEN price_compliance=1 THEN 1 END) as c
             FROM price_audit WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id IN ($repIdsStr) AND closed=1 AND visited_at BETWEEN '$start' AND '$end')"
        );
        $s->priceChecksDone = (int)($prd['t']??0);
        $s->priceCompliant = (int)($prd['c']??0);
        if ($s->priceChecksDone > 0) $s->priceCompliance = round(($s->priceCompliant / $s->priceChecksDone) * 100, 1);

        // ─── Stock ───
        $std = $this->queryRow(
            "SELECT COUNT(*) as t, COUNT(CASE WHEN is_must_stock=1 THEN 1 END) as mt,
                    COUNT(CASE WHEN is_must_stock=1 AND is_out_of_stock=0 THEN 1 END) as mp,
                    COUNT(CASE WHEN is_out_of_stock=1 THEN 1 END) as oos, AVG(freshness_score) as af
             FROM stock_audit WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id IN ($repIdsStr) AND closed=1 AND visited_at BETWEEN '$start' AND '$end')"
        );
        $s->stockChecksDone = (int)($std['t']??0);
        $mt = (int)($std['mt']??0);
        $s->mustStockPresent = (int)($std['mp']??0);
        $s->outOfStockCount = (int)($std['oos']??0);
        $s->avgFreshness = round((float)($std['af']??0), 1);
        if ($mt>0) $s->mustStockRate = round(($s->mustStockPresent / $mt)*100, 1);
        if ($s->stockChecksDone>0) $s->oosRate = round(($s->outOfStockCount / $s->stockChecksDone)*100, 1);

        // ─── Qualité ───
        $qd = $this->queryRow("SELECT AVG(overall_quality_score) as q FROM quality_audit WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id IN ($repIdsStr) AND closed=1 AND visited_at BETWEEN '$start' AND '$end')");
        $s->avgQualityScore = round((float)($qd['q']??0), 1);

        // ─── Visibilité ───
        $vd = $this->queryRow("SELECT AVG(overall_visibility_score) as v FROM visibility_audit WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id IN ($repIdsStr) AND closed=1 AND visited_at BETWEEN '$start' AND '$end')");
        $s->avgVisibilityScore = round((float)($vd['v']??0), 1);

        // ─── Exécution ───
        $ed = $this->queryRow("SELECT COUNT(*) as t, COUNT(CASE WHEN is_completed=1 THEN 1 END) as d FROM sales_activity WHERE visit_id IN (SELECT id FROM sales_visit WHERE sales_rep_id IN ($repIdsStr) AND closed=1 AND visited_at BETWEEN '$start' AND '$end')");
        $s->activitiesTotal = (int)($ed['t']??0);
        $s->activitiesCompleted = (int)($ed['d']??0);
        if ($s->activitiesTotal > 0) $s->executionRate = round(($s->activitiesCompleted / $s->activitiesTotal)*100, 1);

        // Perfect Store Score (moyenne pondérée)
        $s->perfectStoreScore = $this->computePerfectStoreScore($s);

        return $s;
    }

    /**
     * Calcule le Perfect Store Score (/100) — moyenne pondérée des KPIs.
     */
    private function computePerfectStoreScore(SalesStats $s): float
    {
        $score = 0.0;
        $totalWeight = 0.0;

        // Price Compliance (25%)
        $w = 25.0;
        $score += ($s->priceCompliance * $w / 100.0);
        $totalWeight += $w;

        // Must Stock Rate (20%)
        $w = 20.0;
        $score += ($s->mustStockRate * $w / 100.0);
        $totalWeight += $w;

        // Quality Score (15%) — normalisé de /5 à %
        $w = 15.0;
        $score += (($s->avgQualityScore / 5.0) * 100.0 * $w / 100.0);
        $totalWeight += $w;

        // Visibility Score (15%) — normalisé de /5 à %
        $w = 15.0;
        $score += (($s->avgVisibilityScore / 5.0) * 100.0 * $w / 100.0);
        $totalWeight += $w;

        // Execution Rate (15%)
        $w = 15.0;
        $score += ($s->executionRate * $w / 100.0);
        $totalWeight += $w;

        // Freshness (10%) — normalisé de /5 à %
        $w = 10.0;
        $score += (($s->avgFreshness / 5.0) * 100.0 * $w / 100.0);
        $totalWeight += $w;

        return round($score, 1);
    }

    private function queryScalar(string $sql, array $params = []): mixed
    {
        $stmt = $this->connection->prepare($sql);
        foreach ($params as $i => $v) {
            $stmt->bindValue($i + 1, $v);
        }
        return $stmt->executeQuery()->fetchOne();
    }

    private function queryRow(string $sql, array $params = []): array
    {
        $stmt = $this->connection->prepare($sql);
        foreach ($params as $i => $v) {
            $stmt->bindValue($i + 1, $v);
        }
        return $stmt->executeQuery()->fetchAssociative() ?: [];
    }
}
