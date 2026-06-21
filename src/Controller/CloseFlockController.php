<?php

namespace App\Controller;

use App\Entity\Flock;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Contracts\Translation\TranslatorInterface;

#[AsController]
class CloseFlockController extends AbstractController
{
    public function __construct(
        private Security $security,
        private TranslatorInterface $translator,
    ) {}

    public function __invoke(Flock $flock, EntityManagerInterface $entityManager): Flock|JsonResponse
    {
        $user = $this->security->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => $this->translator->trans('error.not_authenticated')], 401);
        }

        $isAdmin = $this->security->isGranted('ROLE_ADMIN') || $this->security->isGranted('ROLE_SUPER_ADMIN');

        if (!$isAdmin && !$this->security->isGranted('ROLE_TECHNICIAN')) {
            return new JsonResponse(['error' => $this->translator->trans('error.access_denied')], 403);
        }

        // Si la bande est déjà fermée, on ne fait rien (idempotence)
        if ($flock->isClosed()) {
            return $flock;
        }

        // Application de la logique métier
        $flock->setClosed(true);
        $flock->setEndDate(new \DateTime()); // Capture la date/heure exacte de l'action

        // Sauvegarde en base
        $entityManager->flush();

        return $flock;
    }
}
