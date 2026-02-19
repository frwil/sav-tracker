<?php

namespace App\Controller;

use App\Entity\Visit;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\AsController;

#[AsController]
class StartVisitController extends AbstractController
{
    public function __invoke(Visit $visit, EntityManagerInterface $em): JsonResponse
    {
        // Vérifications
        if (!$visit->isActivated()) {
            return new JsonResponse(['error' => 'Visite archivée'], 400);
        }
        
        if ($visit->isClosed()) {
            return new JsonResponse(['error' => 'Visite déjà clôturée'], 400);
        }
        
        if ($visit->getVisitedAt() !== null) {
            return new JsonResponse(['error' => 'Visite déjà démarrée'], 400);
        }

        // Démarrage
        $visit->setVisitedAt(new \DateTime());
        $em->flush();

        return new JsonResponse([
            'id' => $visit->getId(),
            'status' => 'in_progress',
            'visitedAt' => $visit->getVisitedAt()->format('c')
        ]);
    }
}