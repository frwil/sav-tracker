<?php

namespace App\Controller;

use App\Entity\PreOrder;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\AsController;

#[AsController]
class CancelPreOrderController extends AbstractController
{
    public function __invoke(PreOrder $order, Request $request, EntityManagerInterface $em): JsonResponse
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

        if ($order->getStatus() === PreOrder::STATUS_DELIVERED) {
            return new JsonResponse([
                'error' => 'Impossible d\'annuler une commande déjà livrée.'
            ], 400);
        }

        if ($order->getStatus() === PreOrder::STATUS_CANCELLED) {
            return new JsonResponse([
                'error' => 'Cette commande est déjà annulée.'
            ], 400);
        }

        // Optionnel : récupérer la raison d'annulation
        $body = json_decode($request->getContent(), true);
        $reason = $body['cancellationReason'] ?? null;

        $order->setStatus(PreOrder::STATUS_CANCELLED);
        if ($reason) {
            $order->setCancellationReason($reason);
        }
        $em->flush();

        return new JsonResponse([
            'id' => $order->getId(),
            'status' => PreOrder::STATUS_CANCELLED,
        ]);
    }
}
