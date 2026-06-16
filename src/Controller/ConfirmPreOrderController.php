<?php

namespace App\Controller;

use App\Entity\PreOrder;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\AsController;

#[AsController]
class ConfirmPreOrderController extends AbstractController
{
    public function __invoke(PreOrder $order, EntityManagerInterface $em): JsonResponse
    {
        // Auth: admin ou le commercial assigné à la visite parente
        $user = $this->getUser();
        if (!$user) {
            return new JsonResponse(['error' => 'Non authentifié'], 401);
        }
        $isAdmin = $this->isGranted('ROLE_ADMIN') || $this->isGranted('ROLE_SUPER_ADMIN');
        $isAssignedRep = $order->getVisit() && $order->getVisit()->getSalesRep()
            && $order->getVisit()->getSalesRep()->getId() === $user->getId();
        if (!$isAdmin && !$isAssignedRep) {
            return new JsonResponse(['error' => 'Accès refusé'], 403);
        }

        if ($order->getStatus() !== PreOrder::STATUS_PREORDER) {
            return new JsonResponse([
                'error' => "Seule une précommande peut être confirmée (statut actuel: {$order->getStatus()})"
            ], 400);
        }

        $order->setStatus(PreOrder::STATUS_CONFIRMED);
        $em->flush();

        return new JsonResponse([
            'id' => $order->getId(),
            'status' => PreOrder::STATUS_CONFIRMED,
        ]);
    }
}
