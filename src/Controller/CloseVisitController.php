<?php

namespace App\Controller;

use App\Entity\Visit;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\Translation\TranslatorInterface;

#[AsController]
class CloseVisitController extends AbstractController
{
    public function __construct(
        private Security $security,
        private TranslatorInterface $translator,
    ) {}

    public function __invoke(Visit $visit, EntityManagerInterface $em): Response
    {
        $user = $this->security->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => $this->translator->trans('error.not_authenticated')], 401);
        }

        $isAdmin = $this->security->isGranted('ROLE_ADMIN') || $this->security->isGranted('ROLE_SUPER_ADMIN');

        if (!$isAdmin) {
            // Seuls les techniciens peuvent clôturer des visites
            if (!$this->security->isGranted('ROLE_TECHNICIAN')) {
                return new JsonResponse(['error' => $this->translator->trans('error.access_denied')], 403);
            }

            // Vérification de propriété : le technicien doit être assigné à la visite
            if (!$visit->getTechnician() || $visit->getTechnician()->getId() !== $user->getId()) {
                return new JsonResponse(['error' => $this->translator->trans('error.access_denied')], 403);
            }

            // Fenêtre de 48h
            $now = new \DateTime();
            $visitedAt = $visit->getVisitedAt();
            if ($visitedAt) {
                $interval = $now->diff($visitedAt);
                if ($interval->days >= 2) {
                    return new JsonResponse(['error' => $this->translator->trans('error.access_denied')], 403);
                }
            }

            if (!$visit->isActivated()) {
                return new JsonResponse(['error' => $this->translator->trans('visit.archived')], 403);
            }
        }

        if ($visit->isClosed()) {
            return new JsonResponse(['error' => $this->translator->trans('visit.already_closed')], 400);
        }

        $visit->setClosed(true);
        $em->flush();

        return $this->json($visit, 200, [], ['groups' => 'visit:read']);
    }
}
