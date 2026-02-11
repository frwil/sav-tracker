<?php

namespace App\Controller;

use App\Entity\User;
use App\Entity\UserObjective;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

#[AsController]
#[IsGranted('ROLE_ADMIN')]
class UserObjectiveController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserRepository $userRepository
    ) {}

    #[Route('/api/users/{id}/define-objective', name: 'api_user_define_objective', methods: ['POST'])]
    public function defineObjective(User $user, Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        // Validation basique
        if (!isset($data['dailyRate']) || !isset($data['startDate'])) {
            return $this->json(['error' => 'Champs dailyRate et startDate requis'], 400);
        }

        try {
            $this->applyObjectiveToUser($user, (int)$data['dailyRate'], new \DateTime($data['startDate']));
            $this->em->flush();
            return $this->json(['message' => 'Objectif mis à jour avec succès'], 200);
        } catch (\Exception $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/api/users/bulk/define-objectives', name: 'api_users_bulk_objectives', methods: ['POST'])]
    public function defineBulkObjectives(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['dailyRate']) || !isset($data['startDate'])) {
            return $this->json(['error' => 'Données incomplètes'], 400);
        }

        $startDate = new \DateTime($data['startDate']);
        $rate = (int)$data['dailyRate'];

        // On récupère tous les techniciens
        // (Assurez-vous que votre méthode findByRole fonctionne ou utilisez une requête custom)
        $technicians = $this->getAllTechnicians();
        $count = 0;

        foreach ($technicians as $tech) {
            try {
                $this->applyObjectiveToUser($tech, $rate, $startDate);
                $count++;
            } catch (\Exception $e) {
                // On continue même si un user échoue (optionnel)
                continue;
            }
        }

        $this->em->flush();

        return $this->json(['message' => "$count techniciens mis à jour"], 200);
    }

    /**
     * Logique métier centrale : Clôture l'ancien et crée le nouveau
     */
    private function applyObjectiveToUser(User $user, int $rate, \DateTime $startDate): void
    {
        // 1. Récupérer le dernier objectif actif (celui qui n'a pas de date de fin ou dont la date de fin est future)
        // On suppose ici que la collection est gérée ou qu'on fait une requête.
        // Pour faire simple, on parcourt la collection (idéalement faire une requête DQL pour perf)
        $objectives = $user->getObjectives();
        
        foreach ($objectives as $obj) {
            // Si c'est l'objectif courant (pas de date de fin)
            if ($obj->getEndDate() === null) {
                
                // Vérification de cohérence
                if ($obj->getStartDate() >= $startDate) {
                    throw new \Exception("Le nouvel objectif ne peut pas commencer avant ou le même jour que l'objectif actuel ({$obj->getStartDate()->format('Y-m-d')})");
                }

                // CLÔTURE : La fin est la veille du nouveau démarrage
                $endDate = (clone $startDate)->modify('-1 day');
                $obj->setEndDate($endDate);
            }
        }

        // 2. Créer le nouvel objectif
        $newObj = new UserObjective();
        $newObj->setDailyRate($rate);
        $newObj->setStartDate($startDate);
        $newObj->setEndDate(null); // Actif indéfiniment
        $user->addObjective($newObj); // La méthode helper gère la relation
        
        $this->em->persist($newObj);
    }

    private function getAllTechnicians(): array
    {
        // Récupération brute de tous les users, filtrage PHP (ou faire une requête SQL LIKE %ROLE_TECHNICIAN%)
        $all = $this->userRepository->findAll();
        return array_filter($all, fn(User $u) => in_array('ROLE_TECHNICIAN', $u->getRoles()));
    }
}