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

#[AsController]
class CloseSalesVisitController extends AbstractController
{
    public function __construct(private Security $security) {}

    public function __invoke(SalesVisit $visit, EntityManagerInterface $em): Response
    {
        $user = $this->security->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Non authentifié.'], 401);
        }

        // Admins peuvent tout faire
        $isAdmin = $this->security->isGranted('ROLE_ADMIN') || $this->security->isGranted('ROLE_SUPER_ADMIN');

        if (!$isAdmin) {
            // Vérifier que le commercial est bien assigné
            if (!$visit->getSalesRep() || $visit->getSalesRep()->getId() !== $user->getId()) {
                return new JsonResponse(['error' => 'Vous n\'êtes pas autorisé à clôturer cette visite.'], 403);
            }

            // Vérifier la fenêtre de 48h pour la clôture
            $now = new \DateTime();
            $interval = $now->diff($visit->getVisitedAt());
            if ($interval->days >= 2) {
                return new JsonResponse(['error' => 'Délai de clôture dépassé (48h). Contactez un administrateur.'], 403);
            }

            // Vérifier que la visite n'est pas archivée
            if (!$visit->isActivated()) {
                return new JsonResponse(['error' => 'Cette visite est archivée.'], 403);
            }
        }

        if ($visit->isClosed()) {
            return new JsonResponse(['error' => 'Cette visite est déjà clôturée.'], 400);
        }

        $visit->setClosed(true);

        if ($visit->getCompletedAt() === null) {
            $visit->setCompletedAt(new \DateTime());
        }

        $em->flush();

        return $this->json($visit, 200, [], ['groups' => 'sales_visit:read']);
    }
}
