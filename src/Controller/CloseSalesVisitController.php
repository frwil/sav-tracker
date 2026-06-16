<?php

namespace App\Controller;

use App\Entity\SalesVisit;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\Translation\TranslatorInterface;

#[AsController]
class CloseSalesVisitController extends AbstractController
{
    public function __construct(
        private Security $security,
        private TranslatorInterface $translator,
    ) {}

    public function __invoke(SalesVisit $visit, EntityManagerInterface $em): Response
    {
        $user = $this->security->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => $this->translator->trans('error.not_authenticated')], 401);
        }

        $isAdmin = $this->security->isGranted('ROLE_ADMIN') || $this->security->isGranted('ROLE_SUPER_ADMIN');

        if (!$isAdmin) {
            if (!$visit->getSalesRep() || $visit->getSalesRep()->getId() !== $user->getId()) {
                return new JsonResponse(['error' => $this->translator->trans('error.access_denied')], 403);
            }

            $now = new \DateTime();
            $interval = $now->diff($visit->getVisitedAt());
            if ($interval->days >= 2) {
                return new JsonResponse(['error' => $this->translator->trans('error.access_denied')], 403);
            }

            if (!$visit->isActivated()) {
                return new JsonResponse(['error' => $this->translator->trans('sales_visit.archived')], 403);
            }
        }

        if ($visit->isClosed()) {
            return new JsonResponse(['error' => $this->translator->trans('sales_visit.already_closed')], 400);
        }

        $visit->setClosed(true);

        if ($visit->getCompletedAt() === null) {
            $visit->setCompletedAt(new \DateTime());
        }

        $em->flush();

        return $this->json($visit, 200, [], ['groups' => 'sales_visit:read']);
    }
}
