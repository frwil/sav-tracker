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
