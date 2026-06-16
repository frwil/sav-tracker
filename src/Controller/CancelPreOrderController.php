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
