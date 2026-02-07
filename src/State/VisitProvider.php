<?php

namespace App\State;

use App\Entity\Visit;
use App\Repository\VisitRepository;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;

class VisitProvider implements ProviderInterface
{
    public function __construct(private VisitRepository $repository) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if (isset($uriVariables['id'])) {
            return $this->repository->findOneForCurrentUser($uriVariables['id']);
        }

        return $this->repository->findForCurrentUser();
    }
}