<?php

namespace App\State;

use App\Entity\Customer;
use App\Repository\CustomerRepository;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;

class CustomerProvider implements ProviderInterface
{
    public function __construct(private CustomerRepository $repository) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        // Collection (GET /api/customers)
        if ($operation->getName() === '_api_/customers{._format}_get_collection') {
            return $this->repository->findForCurrentUser();
        }

        // Item (GET /api/customers/{id})
        if (isset($uriVariables['id'])) {
            return $this->repository->findOneForCurrentUser($uriVariables['id']);
        }

        return $this->repository->findForCurrentUser();
    }
}