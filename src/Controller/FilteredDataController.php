<?php

namespace App\Controller;

use App\Repository\VisitRepository;
use App\Repository\CustomerRepository;
use App\Repository\ProspectionRepository;
use App\Repository\ConsultationRepository;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

#[Route('/api')]
class FilteredDataController extends AbstractController
{
    public function __construct(
        private CustomerRepository $customerRepository,
        private VisitRepository $visitRepository,
        private ProspectionRepository $prospectionRepository,
        private ConsultationRepository $consultationRepository,
        private SerializerInterface $serializer,
        private Security $security,
    ) {}

    #[Route('/customers', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function getCustomers(): JsonResponse
    {
        $customers = $this->customerRepository->findForCurrentUser();

        return new JsonResponse(
            $this->serializer->serialize($customers, 'json', ['groups' => 'customer:read']),
            200,
            [],
            true
        );
    }

    #[Route('/visits', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function getVisits(): JsonResponse
    {
        $visits = $this->visitRepository->findForCurrentUser();

        return new JsonResponse(
            $this->serializer->serialize($visits, 'json', ['groups' => 'visit:read']),
            200,
            [],
            true
        );
    }

    #[Route('/prospections', methods: ['GET'])]
    public function getProspections(): JsonResponse
    {
        $prospections = $this->prospectionRepository->findForCurrentUser();

        return new JsonResponse(
            $this->serializer->serialize($prospections, 'json', ['groups' => 'prospection:read']),
            200,
            [],
            true
        );
    }

    #[Route('/consultations', methods: ['GET'])]
    public function getConsultations(): JsonResponse
    {
        $consultations = $this->consultationRepository->findForCurrentUser();

        return new JsonResponse(
            $this->serializer->serialize($consultations, 'json', ['groups' => 'consultation:read']),
            200,
            [],
            true
        );
    }
}
