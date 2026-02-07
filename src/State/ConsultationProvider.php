<?php

namespace App\State;

use App\Entity\Consultation;
use App\Repository\ConsultationRepository;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;

class ConsultationProvider implements ProviderInterface
{
    public function __construct(private ConsultationRepository $repository) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if (isset($uriVariables['id'])) {
            return $this->repository->findOneForCurrentUser($uriVariables['id']);
        }

        return $this->repository->findForCurrentUser();
    }
}