<?php

namespace App\DataFixtures;

use App\Entity\Building;
use App\Entity\Consultation;
use App\Entity\Customer;
use App\Entity\Flock;
use App\Entity\FlockFeedHistory;
use App\Entity\Observation;
use App\Entity\ObservationPhoto;
use App\Entity\PortfolioHistory;
use App\Entity\PreOrder;
use App\Entity\PriceAudit;
use App\Entity\Problem;
use App\Entity\ProphylaxisTask;
use App\Entity\Prospection;
use App\Entity\QualityAudit;
use App\Entity\SalesActivity;
use App\Entity\SalesPhoto;
use App\Entity\SalesVisit;
use App\Entity\Speculation;
use App\Entity\Standard;
use App\Entity\StockAudit;
use App\Entity\Ticket;
use App\Entity\User;
use App\Entity\UserObjective;
use App\Entity\Visit;
use App\Entity\VisibilityAudit;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    private array $specs = [];
    private array $users = [];
    private array $customers = ['farm' => [], 'store' => []];
    private array $standards = [];
    private array $allFlocks = []; // [customerIdx][buildingIdx][flockIdx]

    // Référence temporelle
    private \DateTime $today;

    public function __construct(private UserPasswordHasherInterface $passwordHasher)
    {
        $this->today = new \DateTime('today');
    }

    public function load(ObjectManager $manager): void
    {
        echo "\n🔄 Génération d'un jeu de données cohérent...\n";

        $this->createSpeculations($manager);
        $this->createStandards($manager);
        $this->createUsers($manager);
        $this->createCustomers($manager);
        $this->createBuildingsAndFlocks($manager);
        $this->createProphylaxisTasks($manager);
        $this->createTechnicianVisits($manager);
        $this->createSalesVisits($manager);
        $this->createProspections($manager);
        $this->createConsultations($manager);
        $this->createTickets($manager);
        $this->createUserObjectives($manager);

        $manager->flush();

        echo "\n✅ Jeu de données cohérent généré !\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    }

    // ─── SPÉCULATIONS ──────────────────────────────────────────

    private function createSpeculations(ObjectManager $manager): void
    {
        foreach (['Poulet de chair', 'Pondeuse', 'Porc', 'Poisson (Tilapia)', 'Poisson (Silure)', 'Bovin'] as $name) {
            $s = new Speculation();
            $s->setName($name);
            $manager->persist($s);
            $this->specs[$name] = $s;
        }
    }

    // ─── STANDARDS ─────────────────────────────────────────────

    private function createStandards(ObjectManager $manager): void
    {
        $curves = [
            'Cobb 500 - Intensif' => [
                'spec' => 'Poulet de chair', 'feed' => 'Concentré 40%',
                'curve' => [
                    ['day' => 1, 'weight' => 42, 'feed_cumulative' => 12, 'feed_daily' => 12],
                    ['day' => 7, 'weight' => 180, 'feed_cumulative' => 150, 'feed_daily' => 30],
                    ['day' => 14, 'weight' => 480, 'feed_cumulative' => 520, 'feed_daily' => 52],
                    ['day' => 21, 'weight' => 950, 'feed_cumulative' => 1200, 'feed_daily' => 85],
                    ['day' => 28, 'weight' => 1600, 'feed_cumulative' => 2200, 'feed_daily' => 120],
                    ['day' => 35, 'weight' => 2300, 'feed_cumulative' => 3600, 'feed_daily' => 155],
                    ['day' => 42, 'weight' => 3000, 'feed_cumulative' => 5300, 'feed_daily' => 190],
                ],
            ],
            'Lohmann Brown' => [
                'spec' => 'Pondeuse', 'feed' => 'Aliment ponte',
                'curve' => [
                    ['day' => 1, 'weight' => 35, 'feed_cumulative' => 8, 'feed_daily' => 8],
                    ['day' => 56, 'weight' => 600, 'feed_cumulative' => 1800, 'feed_daily' => 45],
                    ['day' => 84, 'weight' => 1050, 'feed_cumulative' => 3400, 'feed_daily' => 55],
                ],
            ],
            'Tilapia Standard' => [
                'spec' => 'Poisson (Tilapia)', 'feed' => 'Flottant 36%',
                'curve' => [
                    ['day' => 1, 'weight' => 1, 'feed_cumulative' => 1, 'feed_daily' => 1],
                    ['day' => 60, 'weight' => 100, 'feed_cumulative' => 130, 'feed_daily' => 4],
                    ['day' => 120, 'weight' => 320, 'feed_cumulative' => 500, 'feed_daily' => 8],
                    ['day' => 180, 'weight' => 600, 'feed_cumulative' => 1200, 'feed_daily' => 12],
                ],
            ],
        ];
        foreach ($curves as $name => $data) {
            $std = new Standard();
            $std->setName($name);
            $std->setSpeculation($this->specs[$data['spec']]);
            $std->setFeedType($data['feed']);
            $std->setCurveData($data['curve']);
            $manager->persist($std);
            $this->standards[$name] = $std;
        }
    }

    // ─── UTILISATEURS ──────────────────────────────────────────

    private function createUsers(ObjectManager $manager): void
    {
        $defs = [
            ['username' => 'admin',    'fullname' => 'Super Administrateur', 'code' => 'ADM-001',  'roles' => ['ROLE_SUPER_ADMIN'], 'zone' => 'Siège',   'pass' => 'admin123'],
            ['username' => 'techsav1', 'fullname' => 'Jean Kouamé',          'code' => 'TECH-001', 'roles' => ['ROLE_TECHNICIAN'],  'zone' => 'Littoral','pass' => '111111'],
            ['username' => 'techsav2', 'fullname' => 'Marie Ngono',          'code' => 'TECH-002', 'roles' => ['ROLE_TECHNICIAN'],  'zone' => 'Ouest',   'pass' => '111111'],
            ['username' => 'techsav3', 'fullname' => 'Pierre Tchinda',       'code' => 'TECH-003', 'roles' => ['ROLE_TECHNICIAN'],  'zone' => 'Centre',  'pass' => '111111'],
            ['username' => 'commsav1', 'fullname' => 'Alice Fotso',          'code' => 'SALES-001','roles' => ['ROLE_SALES_REP'],    'zone' => 'Littoral','pass' => '000000'],
            ['username' => 'commsav2', 'fullname' => 'David Simo',           'code' => 'SALES-002','roles' => ['ROLE_SALES_REP'],    'zone' => 'Ouest',   'pass' => '000000'],
        ];
        foreach ($defs as $d) {
            $u = new User();
            $u->setUsername($d['username']);
            $u->setFullname($d['fullname']);
            $u->setCode($d['code']);
            $u->setRoles($d['roles']);
            $u->setWorkZone($d['zone']);
            $u->setPhoneNumber('+237 6' . rand(50, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99));
            $u->setEmail($d['username'] . '@savtracker.cm');
            $u->setPassword($this->passwordHasher->hashPassword($u, $d['pass']));
            $manager->persist($u);
            $this->users[$d['username']] = $u;
        }
    }

    // ─── CLIENTS ───────────────────────────────────────────────

    private function createCustomers(ObjectManager $manager): void
    {
        $zones = ['Littoral', 'Ouest', 'Centre'];
        $farmNames = [
            'Ferme Avicole Moderne', 'Élevage Mboa', 'Poulailler Industriel',
            'Ferme Piscicole du Noun', 'Porcherie de l\'Ouest', 'Ferme des Collines',
            'Élevage Traditionnel Plus', 'Ferme Modèle Bafoussam', 'Complexe Avicole',
            'Ferme du Plateau', 'Ferme AgroPlus', 'Élevage Saint-Martin',
        ];
        $storeNames = ['Provenderie du Centre', 'Aliments Bétail Express', 'Shop Agri Plus',
                       'Point Vert Élevage', 'AgriPro Distribution'];

        // 9 fermes (3 par technicien)
        for ($i = 0; $i < 9; $i++) {
            $zone = $zones[(int)($i / 3)]; // 3 fermes Littoral, 3 Ouest, 3 Centre
            $techIdx = (int)($i / 3) + 1;
            $c = new Customer();
            $c->setName($farmNames[$i]);
            $c->setZone($zone);
            $c->setExactLocation('Zone rurale - Village ' . chr(65 + $i));
            $c->setCode('FRM-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT));
            $c->setErpCode('ERP-F' . ($i + 100));
            $c->setPhoneNumber('+237 6' . rand(50, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99));
            $c->setType('FARM');
            $c->addSpeculation($this->specs[array_rand($this->specs)]);
            $c->setAffectedTo($this->users['techsav' . $techIdx]);
            $manager->persist($c);
            $this->customers['farm'][] = $c;
            $ph = new PortfolioHistory($c->getAffectedTo(), $c);
            $manager->persist($ph);
        }

        // 6 provenderies (3 par commercial)
        for ($i = 0; $i < 6; $i++) {
            $zone = $i < 3 ? 'Littoral' : 'Ouest';
            $rep = $i < 3 ? 'commsav1' : 'commsav2';
            $c = new Customer();
            $c->setName($storeNames[$i % 5] . ($i < 5 ? '' : ' II'));
            $c->setZone($zone);
            $c->setExactLocation('Centre-ville - ' . $zone);
            $c->setCode('PRV-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT));
            $c->setPhoneNumber('+237 6' . rand(50, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99));
            $c->setType('FEED_STORE');
            $c->setAffectedTo($this->users[$rep]);
            $manager->persist($c);
            $this->customers['store'][] = $c;
            $ph = new PortfolioHistory($c->getAffectedTo(), $c);
            $manager->persist($ph);
        }

        // 1 client mixte
        $c = new Customer();
        $c->setName('Groupe Agro-Élevage Réunis');
        $c->setZone('Littoral');
        $c->setExactLocation('Douala - Zone industrielle');
        $c->setCode('BTH-001');
        $c->setType('BOTH');
        $c->addSpeculation($this->specs['Poulet de chair']);
        $c->addSpeculation($this->specs['Pondeuse']);
        $c->setAffectedTo($this->users['techsav1']);
        $manager->persist($c);
        $this->customers['both'] = $c;
    }

    // ─── BÂTIMENTS & BANDES ───────────────────────────────────

    private function createBuildingsAndFlocks(ObjectManager $manager): void
    {
        $flockNames = ['Bande Démarrage', 'Bande Croissance', 'Bande Finition', 'Lot Ponte', 'Alevins', 'Grossissement'];

        foreach ($this->customers['farm'] as $farmIdx => $customer) {
            $nbBuildings = ($farmIdx < 5) ? 2 : 1; // 5 premières fermes ont 2 bâtiments, les autres 1
            $this->allFlocks[$farmIdx] = [];

            for ($b = 0; $b < $nbBuildings; $b++) {
                $building = new Building();
                $building->setCustomer($customer);
                $customer->addBuilding($building);
                $building->setName('Bâtiment ' . chr(65 + $b) . '-' . $customer->getName());
                $building->setMaxCapacity($cap = [1000, 1500, 2000, 2500, 3000, 5000][array_rand([1000, 1500, 2000, 2500, 3000, 5000])]);
                $building->setSurface($cap * rand(15, 40) / 100);
                $manager->persist($building);

                $this->allFlocks[$farmIdx][$b] = [];

                // Chaque bâtiment a 1 bande active ET parfois 1 bande clôturée
                $hasClosed = rand(0, 1);

                // Bande clôturée (historique, terminée il y a 10-60 jours)
                if ($hasClosed) {
                    $start = (clone $this->today)->modify('-' . rand(65, 120) . ' days');
                    $flock = $this->createFlock($manager, $building,
                        $flockNames[array_rand($flockNames)] . ' (terminée)',
                        $cap,
                        $start,
                        true,
                        (clone $start)->modify('+' . rand(35, 56) . ' days')
                    );
                    $this->allFlocks[$farmIdx][$b][] = $flock;
                }

                // Bande active (en cours)
                $activeStart = $hasClosed
                    ? (clone $this->today)->modify('-' . rand(5, 40) . ' days')
                    : (clone $this->today)->modify('-' . rand(15, 70) . ' days');
                $flock = $this->createFlock($manager, $building,
                    $flockNames[array_rand($flockNames)] . ' (en cours)',
                    $cap,
                    $activeStart,
                    false,
                    null
                );
                $this->allFlocks[$farmIdx][$b][] = $flock;
            }
        }
    }

    private function createFlock(ObjectManager $manager, Building $building,
        string $name, int $capacity, \DateTime $start, bool $closed, ?\DateTime $end): Flock
    {
        $flock = new Flock();
        $flock->setBuilding($building);
        $building->addFlock($flock);
        $flock->setName($name);
        $flock->setSpeculation($this->specs[array_rand($this->specs)]);
        $flock->setSubjectCount(rand((int)($capacity * 0.5), $capacity));
        $flock->setStartDate($start);
        $flock->setClosed($closed);
        if ($closed && $end) {
            $flock->setEndDate($end);
        }
        if (rand(0, 1)) {
            $flock->setStandard($this->standards[array_rand($this->standards)]);
        }
        $manager->persist($flock);

        // Historique d'alimentation
        $feed = new FlockFeedHistory();
        $feed->setFlock($flock);
        $feed->setNewStrategy(['INDUSTRIAL', 'SELF_MIX', 'THIRD_PARTY'][rand(0, 2)]);
        $feed->setNewFormula('Formule ' . chr(65 + rand(0, 5)));
        if (rand(0, 2)) {
            $feed->setPreviousStrategy(['INDUSTRIAL', 'SELF_MIX'][rand(0, 1)]);
            $feed->setPreviousFormula('Ancienne Formule ' . chr(65 + rand(0, 3)));
        }
        $manager->persist($feed);

        return $flock;
    }

    // ─── PROPHYLAXIE ───────────────────────────────────────────

    private function createProphylaxisTasks(ObjectManager $manager): void
    {
        $tasks = [
            ['spec' => 'Poulet de chair', 'day' => 7, 'name' => 'Gumboro I', 'type' => 'VACCIN'],
            ['spec' => 'Poulet de chair', 'day' => 14, 'name' => 'Gumboro II', 'type' => 'VACCIN'],
            ['spec' => 'Poulet de chair', 'day' => 21, 'name' => 'Newcastle', 'type' => 'VACCIN'],
            ['spec' => 'Pondeuse', 'day' => 14, 'name' => 'Marek + Gumboro', 'type' => 'VACCIN'],
            ['spec' => 'Pondeuse', 'day' => 28, 'name' => 'Newcastle + Bronchite', 'type' => 'VACCIN'],
            ['spec' => 'Porc', 'day' => 30, 'name' => 'Déparasitage', 'type' => 'TRAITEMENT'],
            ['spec' => 'Poisson (Tilapia)', 'day' => 14, 'name' => 'Vitamine C', 'type' => 'VITAMINE'],
        ];
        foreach ($tasks as $t) {
            if (!isset($this->specs[$t['spec']])) continue;
            $task = new ProphylaxisTask();
            $task->setSpeculation($this->specs[$t['spec']]);
            $task->setTargetDay($t['day']);
            $task->setName($t['name']);
            $task->setType($t['type']);
            $manager->persist($task);
        }
    }

    // ─── VISITES TECHNICIENS ───────────────────────────────────

    private function createTechnicianVisits(ObjectManager $manager): void
    {
        $objectives = [
            'Suivi de croissance et pesée', 'Vérification prophylaxie',
            'Détection de problèmes sanitaires', 'Audit alimentation',
            'Visite de routine', 'Suivi post-vaccination',
            'Démarrage nouvelle bande', 'Évaluation qualité eau',
            'Conseil nutritionnel', 'Inspection bâtiment',
        ];

        // Chaque technicien visite SES fermes (celles dans sa zone), à raison de 2-4 visites par ferme
        $techZones = ['techsav1' => [0, 1, 2], 'techsav2' => [3, 4, 5], 'techsav3' => [6, 7, 8]];
        $unresolvedProblems = []; // [customerIdx => Problem[]] — problèmes non résolus à suivre

        foreach ($techZones as $techKey => $farmIndices) {
            $tech = $this->users[$techKey];

            foreach ($farmIndices as $farmIdx) {
                $customer = $this->customers['farm'][$farmIdx];
                $nbVisits = rand(3, 5); // 3 à 5 visites par ferme

                // Dates de visites espacées régulièrement sur les 60 derniers jours
                $visitDates = [];
                for ($v = 0; $v < $nbVisits; $v++) {
                    $daysAgo = (int)(($nbVisits - $v) * (60 / $nbVisits)) + rand(-3, 0);
                    $visitDates[] = max(1, $daysAgo); // au moins J-1
                }
                sort($visitDates);
                $visitDates = array_unique($visitDates);
                if (empty($visitDates)) $visitDates = [1, 15, 45];
                sort($visitDates);

                $prevObs = null; // observation de la visite précédente (pour lier les problèmes)

                foreach ($visitDates as $vi => $daysAgo) {
                    $isLastVisit = ($vi === count($visitDates) - 1);
                    $isClosed = !$isLastVisit; // seule la dernière visite est encore ouverte

                    // Cohérence temporelle
                    $plannedAt = (clone $this->today)->modify("-{$daysAgo} days")->setTime(8, 0);
                    $visitedAt = (clone $plannedAt)->modify('+' . rand(0, 2) . ' days')->setTime(rand(9, 14), rand(0, 59));

                    $visit = new Visit();
                    $visit->setTechnician($tech);
                    $visit->setCustomer($customer);
                    $visit->setPlannedAt($plannedAt);
                    $visit->setVisitedAt($visitedAt);
                    $visit->setObjective($objectives[array_rand($objectives)]);
                    $visit->setGpsCoordinates(
                        round(3.8 + rand(0, 200) / 1000, 5) . ', ' . round(9.7 + rand(0, 500) / 1000, 5)
                    );
                    $visit->setClosed($isClosed);

                    if ($isClosed) {
                        $visit->setCompletedAt((clone $visitedAt)->modify('+' . rand(45, 180) . ' minutes'));
                    }

                    $manager->persist($visit);

                    // ── Observations (1 par bâtiment visité, MAX 3) ──
                    $buildings = $customer->getBuildings()->toArray();
                    if (empty($buildings)) goto skipObs;

                    $nbObs = min(rand(1, 3), count($buildings));
                    $visitedBuildings = array_rand($buildings, min($nbObs, count($buildings)));
                    if (!is_array($visitedBuildings)) $visitedBuildings = [$visitedBuildings];
                    $currentVisitObs = [];

                    foreach ($visitedBuildings as $bIdx) {
                        $building = $buildings[$bIdx];
                        $flocks = $building->getFlocks()->toArray();
                        if (empty($flocks)) continue;

                        // Choisir une bande encore active au moment de la visite
                        $validFlocks = array_filter($flocks, function ($f) use ($visitedAt) {
                            if ($f->isClosed() && $f->getEndDate() < $visitedAt) return false;
                            return $f->getStartDate() <= $visitedAt;
                        });
                        if (empty($validFlocks)) $validFlocks = $flocks;
                        $flock = $validFlocks[array_rand($validFlocks)];

                        $obs = new Observation();
                        $obs->setVisit($visit);
                        $obs->setFlock($flock);
                        $obs->setObservedAt(clone $visitedAt);
                        $obs->setConcerns($this->randomConcern($isClosed));
                        $obs->setObservationComment($this->randomObservationComment());
                        $obs->setRecommendations($this->randomRecommendation());
                        $obs->setData($this->randomObservationData($flock->getSpeculation()?->getName()));
                        $manager->persist($obs);
                        $currentVisitObs[] = $obs;

                        // ── Problèmes (détectés dans les visites fermées) ──
                        if ($isClosed && rand(0, 3) === 0) {
                            $problem = new Problem();
                            $problem->setDetectedIn($obs);
                            $problem->setDescription($this->randomProblemDescription());
                            $problem->setSeverity(['low', 'medium', 'high'][rand(0, 2)]);
                            // Si on a une observation précédente avec un problème non résolu, on le résout maintenant
                            if (!empty($unresolvedProblems[$farmIdx] ?? []) && rand(0, 2) === 0) {
                                $oldProblem = array_shift($unresolvedProblems[$farmIdx]);
                                $oldProblem->setResolvedIn($obs);
                                $problem->setSeverity('low'); // nouveau problème mineur
                            }
                            if ($problem->getStatus() === Problem::STATUS_OPEN) {
                                $unresolvedProblems[$farmIdx][] = $problem;
                            }
                            $manager->persist($problem);
                        }

                        // Photo (1/3 des observations)
                        if (rand(0, 2) === 0) {
                            $photo = new ObservationPhoto();
                            $photo->setObservation($obs);
                            $photo->contentUrl = '/uploads/observations/demo_' . uniqid() . '.jpg';
                            $manager->persist($photo);
                        }
                    }

                    $prevObs = $currentVisitObs[0] ?? null;
                }
                skipObs:;
            }
        }
    }

    // ─── VISITES COMMERCIALES ─────────────────────────────────

    private function createSalesVisits(ObjectManager $manager): void
    {
        $objectives = [
            'Visite commerciale mensuelle', 'Promotion nouveau produit', 'Audit qualité point de vente',
            'Négociation contrat', 'Lancement campagne saisonnière', 'Suivi commande', 'Contrôle merchandising',
        ];
        $products = [
            ['code' => 'ALIM-DP-001', 'name' => 'Démarrage Poulet 50kg', 'must' => true],
            ['code' => 'ALIM-CP-002', 'name' => 'Croissance Poulet 50kg', 'must' => true],
            ['code' => 'ALIM-FP-003', 'name' => 'Finition Poulet 50kg', 'must' => true],
            ['code' => 'ALIM-PN-004', 'name' => 'Ponte Complète 50kg', 'must' => false],
            ['code' => 'ALIM-PC-005', 'name' => 'Porc Croissance 50kg', 'must' => false],
            ['code' => 'ALIM-TL-006', 'name' => 'Tilapia Flottant 25kg', 'must' => false],
            ['code' => 'COMP-VM-007', 'name' => 'Complément Vitaminé 5kg', 'must' => false],
            ['code' => 'COMP-CA-008', 'name' => 'Coquillages/Calcium 25kg', 'must' => false],
        ];
        $activityTypes = SalesActivity::getTypes();
        $activityKeys = array_keys($activityTypes);

        $repStores = ['commsav1' => [0, 1, 2], 'commsav2' => [3, 4, 5]];

        foreach ($repStores as $repKey => $storeIndices) {
            $rep = $this->users[$repKey];

            foreach ($storeIndices as $storeIdx) {
                $customer = $this->customers['store'][$storeIdx];
                $nbVisits = rand(3, 5);

                $visitDates = [];
                for ($v = 0; $v < $nbVisits; $v++) {
                    $daysAgo = (int)(($nbVisits - $v) * (50 / $nbVisits)) + rand(-3, 0);
                    $visitDates[] = max(1, $daysAgo);
                }
                sort($visitDates);
                $visitDates = array_unique($visitDates);

                foreach ($visitDates as $vi => $daysAgo) {
                    $isLastVisit = ($vi === count($visitDates) - 1);
                    $isClosed = !$isLastVisit;

                    $plannedAt = (clone $this->today)->modify("-{$daysAgo} days")->setTime(8, 0);
                    $visitedAt = (clone $plannedAt)->modify('+' . rand(0, 1) . ' days')->setTime(rand(9, 15), rand(0, 59));

                    $sv = new SalesVisit();
                    $sv->setSalesRep($rep);
                    $sv->setCustomer($customer);
                    $sv->setPlannedAt($plannedAt);
                    $sv->setVisitedAt($visitedAt);
                    $sv->setObjective($objectives[array_rand($objectives)]);
                    $sv->setGpsCoordinates(
                        round(3.8 + rand(0, 200) / 1000, 5) . ', ' . round(9.7 + rand(0, 500) / 1000, 5)
                    );
                    $sv->setClosed($isClosed);
                    if ($isClosed) {
                        $sv->setCompletedAt((clone $visitedAt)->modify('+' . rand(30, 120) . ' minutes'));
                    }
                    $manager->persist($sv);

                    // Toutes les activités de la check-list
                    $allTypes = $activityKeys;
                    shuffle($allTypes);
                    $nbActs = $isClosed ? rand(6, 9) : rand(3, 7);
                    for ($a = 0; $a < min($nbActs, count($allTypes)); $a++) {
                        $act = new SalesActivity();
                        $act->setVisit($sv);
                        $act->setActivityType($allTypes[$a]);
                        $act->setCompleted($isClosed || rand(0, 10) > 3);
                        $act->setSortOrder($a);
                        if ($act->isCompleted()) {
                            $act->setCompletedAt((clone $visitedAt)->modify('+' . rand(5, 60) . ' minutes'));
                        }
                        $manager->persist($act);
                    }

                    // Price audits (2-4 produits)
                    $auditedIdxs = array_rand($products, rand(2, 4));
                    if (!is_array($auditedIdxs)) $auditedIdxs = [$auditedIdxs];
                    foreach ($auditedIdxs as $pIdx) {
                        $p = $products[$pIdx];
                        $expected = rand(12000, 25000);
                        $pa = new PriceAudit();
                        $pa->setVisit($sv);
                        $pa->setProductCode($p['code']);
                        $pa->setProductName($p['name']);
                        $pa->setExpectedPrice($expected);
                        $pa->setObservedPrice($expected + rand(-1000, 2000));
                        if (rand(0, 2) === 0) {
                            $pa->setCompetitor1Name('Provimi');
                            $pa->setCompetitor1Price($expected + rand(-500, 3000));
                        }
                        if (rand(0, 3) === 0) {
                            $pa->setCompetitor2Name('Sanders');
                            $pa->setCompetitor2Price($expected + rand(-1000, 2000));
                        }
                        if (rand(0, 5) === 0) {
                            $pa->setPromoActive(true);
                            $pa->setPromoPrice((int)($expected * 0.9));
                        }
                        $manager->persist($pa);
                    }

                    // Stock audits (mêmes produits)
                    foreach ($auditedIdxs as $pIdx) {
                        $p = $products[$pIdx];
                        $sa = new StockAudit();
                        $sa->setVisit($sv);
                        $sa->setProductCode($p['code']);
                        $sa->setProductName($p['name']);
                        $sa->setMustStock($p['must']);
                        $sa->setStockQuantity(rand(0, 200));
                        $sa->setStockUnit('SAC');
                        $sa->setOutOfStock($sa->getStockQuantity() === 0);
                        $sa->setFifoCompliant(rand(0, 10) > 1);
                        $sa->setOldestMfgDate((clone $visitedAt)->modify('-' . rand(10, 60) . ' days'));
                        $sa->setExpiryDate((clone $visitedAt)->modify('+' . rand(30, 150) . ' days'));
                        $sa->setFreshnessScore(rand(2, 5));
                        $sa->setPackagingIntact(rand(0, 10) > 1);
                        $manager->persist($sa);
                    }

                    // Quality audit (toutes les visites fermées, 50% des ouvertes)
                    if ($isClosed || rand(0, 1)) {
                        $qa = new QualityAudit();
                        $qa->setVisit($sv);
                        $qa->setDamagedBagsCount(rand(0, 10));
                        $qa->setDamagedBagsRate(rand(0, 15));
                        $qa->setStorageOnPallets(rand(0, 10) > 2);
                        $qa->setStorageDryArea(rand(0, 10) > 1);
                        $qa->setStorageProtected(rand(0, 10) > 1);
                        $qa->setPestPresence(rand(0, 10) === 0);
                        $qa->setMoldPresence(rand(0, 20) === 0);
                        $qa->setOdorIssue(rand(0, 15) === 0);
                        $qa->setCleanlinessScore(rand(2, 5));
                        $qa->setOverallQualityScore(rand(3, 5));
                        $manager->persist($qa);
                    }

                    // Visibility audit (idem)
                    if ($isClosed || rand(0, 1)) {
                        $va = new VisibilityAudit();
                        $va->setVisit($sv);
                        $va->setHasPosters((bool)rand(0, 1));
                        $va->setHasBanners(rand(0, 3) === 0);
                        $va->setHasCalendars((bool)rand(0, 1));
                        $va->setHasBrandedSacs(rand(0, 10) > 3);
                        $va->setSignageVisible((bool)rand(0, 1));
                        $va->setBrandedItems(rand(0, 1) ? ['aprons', 'caps'] : null);
                        $va->setOurVisibilityPercent(rand(30, 90));
                        $va->setOverallVisibilityScore(rand(2, 5));
                        $manager->persist($va);
                    }

                    // PreOrders (0-3 par visite, plus probable si fermée)
                    $maxOrders = $isClosed ? rand(1, 3) : rand(0, 2);
                    for ($po = 0; $po < $maxOrders; $po++) {
                        $p = $products[array_rand($products)];
                        $order = new PreOrder();
                        $order->setVisit($sv);
                        $order->setCustomer($customer);
                        $order->setProductCode($p['code']);
                        $order->setProductName($p['name']);
                        $order->setQuantity(rand(10, 200));
                        $order->setUnit('SAC');
                        $order->setUnitPrice(rand(12000, 25000));

                        // Statut cohérent : si visite récente → PREORDER ou CONFIRMED, si ancienne → DELIVERED
                        if ($daysAgo > 14) {
                            $status = rand(0, 4) > 0 ? PreOrder::STATUS_DELIVERED : PreOrder::STATUS_CANCELLED;
                        } elseif ($daysAgo > 7) {
                            $status = rand(0, 1) ? PreOrder::STATUS_CONFIRMED : PreOrder::STATUS_DELIVERED;
                        } else {
                            $status = rand(0, 1) ? PreOrder::STATUS_PREORDER : PreOrder::STATUS_CONFIRMED;
                        }
                        $order->setStatus($status);
                        $order->setExpectedDeliveryAt((clone $visitedAt)->modify('+' . rand(1, 14) . ' days'));

                        if ($status === PreOrder::STATUS_DELIVERED) {
                            $order->setDeliveredAt((clone $visitedAt)->modify('+' . rand(1, 10) . ' days'));
                        }
                        if ($status === PreOrder::STATUS_CANCELLED) {
                            $order->setCancellationReason(['Rupture fournisseur', 'Annulation client', 'Problème logistique'][rand(0, 2)]);
                        }
                        $manager->persist($order);
                    }

                    // Photos (1-3 par visite fermée, 0-2 par visite ouverte)
                    $maxPhotos = $isClosed ? rand(1, 3) : rand(0, 2);
                    for ($ph = 0; $ph < $maxPhotos; $ph++) {
                        $photo = new SalesPhoto();
                        $photo->setVisit($sv);
                        $photo->setContentUrl('/uploads/sales/demo_' . uniqid() . '.jpg');
                        $photo->setCategory(['PRICE', 'STOCK', 'QUALITY', 'VISIBILITY', 'GENERAL'][rand(0, 4)]);
                        $photo->setCaption('Photo ' . ($ph + 1));
                        $manager->persist($photo);
                    }
                }
            }
        }
    }

    // ─── PROSPECTIONS ──────────────────────────────────────────

    private function createProspections(ObjectManager $manager): void
    {
        $statuses = ['NEW', 'IN_PROGRESS', 'WON', 'LOST'];
        foreach (['techsav1', 'techsav2'] as $techKey) {
            $tech = $this->users[$techKey];
            for ($i = 0; $i < 5; $i++) {
                $p = new Prospection();
                $p->setTechnician($tech);
                $p->setClient($this->customers['farm'][array_rand($this->customers['farm'])]);
                $p->setDate((clone $this->today)->modify('-' . rand(5, 60) . ' days'));
                $p->setConcerns($this->randomConcern(true));
                $p->setExpectations('Amélioration des performances zootechniques');
                $p->setInterventionDone(rand(0, 1));
                $p->setAppointmentTaken(rand(0, 1));
                if ($p->isAppointmentTaken()) {
                    $p->setAppointmentDate((clone $this->today)->modify('+' . rand(1, 30) . ' days'));
                    $p->setAppointmentReason('Visite de suivi technique');
                }
                $p->setStatus($statuses[$i % 4]);
                $manager->persist($p);
            }
        }
    }

    // ─── CONSULTATIONS ─────────────────────────────────────────

    private function createConsultations(ObjectManager $manager): void
    {
        foreach (['techsav1', 'techsav3'] as $techKey) {
            $tech = $this->users[$techKey];
            for ($i = 0; $i < 4; $i++) {
                $c = new Consultation();
                $c->setTechnician($tech);
                $c->setCustomer($this->customers['farm'][array_rand($this->customers['farm'])]);
                $c->setDate((clone $this->today)->modify('-' . rand(3, 40) . ' days'));
                $c->setConcerns('Conseil sur la formulation alimentaire');
                $c->setInterventionDone(rand(0, 1));
                $c->setAppointmentTaken(rand(0, 1));
                if ($c->isAppointmentTaken()) {
                    $c->setAppointmentDate((clone $this->today)->modify('+' . rand(1, 30) . ' days'));
                }
                $manager->persist($c);
            }
        }
    }

    // ─── TICKETS ───────────────────────────────────────────────

    private function createTickets(ObjectManager $manager): void
    {
        $categories = ['WEIGHT_ANOMALY', 'MORTALITY_ALERT', 'EQUIPMENT_FAILURE', 'SUPPLY_SHORTAGE'];
        $priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        $statusFlow = ['OPEN', 'OPEN', 'IN_PROGRESS', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

        for ($i = 0; $i < 10; $i++) {
            $t = new Ticket();
            $t->setCategory($categories[array_rand($categories)]);
            $t->setPriority($priorities[array_rand($priorities)]);
            $t->setStatus($statusFlow[$i % 6]);
            $t->setDescription($this->randomProblemDescription());
            $manager->persist($t);
        }
    }

    // ─── OBJECTIFS ─────────────────────────────────────────────

    private function createUserObjectives(ObjectManager $manager): void
    {
        $rates = [8, 10, 12, 15];
        foreach (['techsav1', 'techsav2', 'techsav3'] as $uk) {
            $obj = new UserObjective();
            $obj->setUser($this->users[$uk]);
            $obj->setDailyRate($rates[array_rand($rates)]);
            $obj->setStartDate((clone $this->today)->modify('-3 months'));
            $obj->setEndDate((clone $this->today)->modify('+6 months'));
            $manager->persist($obj);
        }
    }

    // ─── HELPERS ───────────────────────────────────────────────

    private function randomConcern(bool $some = true): string
    {
        $all = [
            'Baisse de consommation alimentaire', 'Mortalité en hausse depuis 3 jours',
            'Prise de poids insuffisante', 'Diarrhées observées', 'Problèmes respiratoires',
            'Picage entre animaux', 'Boiteries sur plusieurs sujets', 'Chute de ponte',
            'Eau de boisson suspecte', 'Aucune préoccupation particulière',
        ];
        return $all[array_rand($all)];
    }

    private function randomObservationComment(): string
    {
        $c = [
            'Pesée conforme au standard pour l\'âge.', 'Légère baisse de poids par rapport au standard.',
            'Mortalité dans les normes acceptables (<2%).', 'Aliment bien consommé, pas de gaspillage.',
            'Litière humide à changer.', 'Ventilation insuffisante dans le bâtiment.',
            'Température ambiante trop élevée.', 'Abreuvoirs propres et fonctionnels.',
        ];
        return $c[array_rand($c)];
    }

    private function randomRecommendation(): string
    {
        $r = [
            'Ajuster la ration alimentaire.', 'Renforcer la ventilation du bâtiment.',
            'Changer la litière dans les 48h.', 'Administrer un complexe vitaminé.',
            'Isoler les sujets malades.', 'Vérifier la qualité de l\'eau.',
            'Augmenter la fréquence de désinfection.', 'Planifier une visite de suivi dans 7 jours.',
        ];
        return $r[array_rand($r)];
    }

    private function randomProblemDescription(): string
    {
        $p = [
            'Taux de mortalité supérieur à 5% sur les 3 derniers jours',
            'Gain de poids quotidien inférieur de 20% au standard',
            'Sacs d\'aliment troués dans le stock',
            'Présence de charançons dans le stock d\'aliment',
            'Suspicion de coccidiose dans le bâtiment B',
            'Température excessive dans le poulailler (>35°C)',
            'Approvisionnement en aliment croissance insuffisant',
            'Problème de granulométrie sur le lot livré',
        ];
        return $p[array_rand($p)];
    }

    private function randomObservationData(?string $specName): array
    {
        $specName = $specName ?? 'Poulet de chair';

        if (str_contains($specName, 'Poulet') || str_contains($specName, 'Pondeuse')) {
            return [
                'mortality' => rand(0, 15),
                'weight' => rand(800, 2800),
                'feed_consumption' => rand(40, 180),
                'density' => rand(8, 15),
                'temperature' => rand(24, 34),
                'inventory' => rand(200, 4000),
            ];
        }
        if (str_contains($specName, 'Poisson')) {
            return [
                'mortality' => rand(0, 50),
                'weight' => rand(5, 400),
                'oxygen_level' => round(rand(40, 80) / 10, 1),
                'ph' => round(rand(65, 85) / 10, 1),
                'inventory' => rand(500, 10000),
            ];
        }
        if (str_contains($specName, 'Porc')) {
            return [
                'mortality' => rand(0, 3),
                'weight' => rand(15, 80),
                'feed_consumption' => rand(20, 60),
                'inventory' => rand(50, 300),
            ];
        }
        return ['inventory' => rand(100, 1000)];
    }
}
