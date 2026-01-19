<?php

namespace App\Controller;

use App\Entity\Visit;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpKernel\Attribute\AsController;

#[AsController]
class CloseVisitController extends AbstractController
{
    public function __invoke(Visit $visit, EntityManagerInterface $em): Visit
    {
        // On passe simplement le statut à "closed"
        $visit->setClosed(true);
        $em->flush();

        return $visit;
    }
}