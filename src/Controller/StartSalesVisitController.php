<?php

namespace App\Controller;

use App\Entity\SalesVisit;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Contracts\Translation\TranslatorInterface;

#[AsController]
class StartSalesVisitController extends AbstractController
{
    public function __invoke(SalesVisit $visit, EntityManagerInterface $em, TranslatorInterface $translator): JsonResponse
    {
        if (!$visit->isActivated()) {
            return new JsonResponse(['error' => $translator->trans('sales_visit.archived')], 400);
        }

        if ($visit->isClosed()) {
            return new JsonResponse(['error' => $translator->trans('sales_visit.already_closed')], 400);
        }

        if ($visit->getVisitedAt() !== null) {
            return new JsonResponse(['error' => $translator->trans('sales_visit.already_started')], 400);
        }

        $user = $this->getUser();
        if (!$user || (!$this->isGranted('ROLE_ADMIN') && !$this->isGranted('ROLE_SUPER_ADMIN')
            && (!$visit->getSalesRep() || $visit->getSalesRep()->getId() !== $user->getId()))) {
            return new JsonResponse(['error' => $translator->trans('error.access_denied')], 403);
        }

        $visit->setVisitedAt(new \DateTime());
        $em->flush();

        return new JsonResponse([
            'id' => $visit->getId(),
            'status' => 'in_progress',
            'visitedAt' => $visit->getVisitedAt()->format('c'),
        ]);
    }
}
