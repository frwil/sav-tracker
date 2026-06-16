<?php

namespace App\Controller;

use App\Entity\PreOrder;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\AsController;

#[AsController]
class DeliverPreOrderController extends AbstractController
{
    public function __invoke(PreOrder $order, EntityManagerInterface $em): JsonResponse
    {
        if ($order->getStatus() !== PreOrder::STATUS_CONFIRMED) {
            return new JsonResponse([
                'error' => "Seule une commande confirmée peut être livrée (statut actuel: {$order->getStatus()})"
            ], 400);
        }

        $order->setStatus(PreOrder::STATUS_DELIVERED);
        // deliveredAt is auto-set by PreUpdate lifecycle callback
        $em->flush();

        return new JsonResponse([
            'id' => $order->getId(),
            'status' => PreOrder::STATUS_DELIVERED,
        ]);
    }
}
