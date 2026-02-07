<?php

namespace App\State;

use App\Entity\Prospection;
use App\Repository\ProspectionRepository;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;

class ProspectionProvider implements ProviderInterface
{
    public function __construct(private ProspectionRepository $repository) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if (isset($uriVariables['id'])) {
            return $this->repository->findOneForCurrentUser($uriVariables['id']);
        }

        return $this->repository->findForCurrentUser();
    }
}