<?php

namespace App\Controller;

use App\Entity\PreOrder;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Contracts\Translation\TranslatorInterface;

#[AsController]
class CancelPreOrderController extends AbstractController
{
    public function __invoke(PreOrder $order, Request $request, EntityManagerInterface $em, TranslatorInterface $translator): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return new JsonResponse(['error' => $translator->trans('error.not_authenticated')], 401);
        }
        $isAdmin = $this->isGranted('ROLE_ADMIN') || $this->isGranted('ROLE_SUPER_ADMIN');
        $isAssignedRep = $order->getVisit() && $order->getVisit()->getSalesRep()
            && $order->getVisit()->getSalesRep()->getId() === $user->getId();
        if (!$isAdmin && !$isAssignedRep) {
            return new JsonResponse(['error' => $translator->trans('error.access_denied')], 403);
        }

        if ($order->getStatus() === PreOrder::STATUS_DELIVERED) {
            return new JsonResponse(['error' => $translator->trans('pre_order.cannot_cancel_delivered')], 400);
        }
        if ($order->getStatus() === PreOrder::STATUS_CANCELLED) {
            return new JsonResponse(['error' => $translator->trans('pre_order.already_cancelled')], 400);
        }

        $body = json_decode($request->getContent(), true);
        $reason = $body['cancellationReason'] ?? null;

        $order->setStatus(PreOrder::STATUS_CANCELLED);
        if ($reason) {
            $order->setCancellationReason($reason);
        }
        $em->flush();

        return new JsonResponse(['id' => $order->getId(), 'status' => PreOrder::STATUS_CANCELLED]);
    }
}
