<?php

namespace App\State;

use App\Repository\VisitRepository;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\State\ProviderInterface;

class VisitProvider implements ProviderInterface
{
    public function __construct(private VisitRepository $repository) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        // 1. Gestion de la récupération d'une seule visite (GET item)
        if (isset($uriVariables['id'])) {
            return $this->repository->findOneForCurrentUser($uriVariables['id']);
        }

        // 2. Gestion de la collection (GET collection) avec filtres et pagination
        if ($operation instanceof GetCollection) {
        $filters = $context['filters'] ?? [];
        
        $page = (int) ($filters['page'] ?? 1);
        $itemsPerPage = (int) ($filters['itemsPerPage'] ?? 20);
        $mode = $filters['mode'] ?? 'planning';
        
        // Récupération du filtre activated (gérer le format string 'true'/'false' d'API Platform)
        $activated = null;
        if (isset($filters['activated'])) {
            $activated = filter_var($filters['activated'], FILTER_VALIDATE_BOOLEAN);
        }

        $after = $filters['plannedAt']['after'] ?? $filters['visitedAt']['after'] ?? $filters['completedAt']['after'] ?? null;
        $before = $filters['plannedAt']['before'] ?? $filters['visitedAt']['before'] ?? $filters['completedAt']['before'] ?? null;
        $customerId = isset($filters['customer']) ? (int)$filters['customer'] : null;

        return $this->repository->findVisitsWithPagination(
            $mode, 
            $after, 
            $before, 
            $customerId, 
            $page, 
            $itemsPerPage,
            $activated // ✅ Passage du paramètre ici
        );
    }

        return $this->repository->findForCurrentUser();
    }
}