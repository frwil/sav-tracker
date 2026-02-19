<?php
// src/ApiPlatform/Filter/TechnicianFilter.php

namespace App\ApiPlatform\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

final class TechnicianFilter extends AbstractFilter
{
    protected function filterProperty(
        string $property,
        mixed $value,
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        Operation $operation = null,
        array $context = []
    ): void {
        if ($property !== 'technician') {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $valueParameter = $queryNameGenerator->generateParameterName('technician');

        // Accepte soit "456" soit "/api/users/456" ou "/api/technicians/456"
        $technicianId = is_numeric($value) 
            ? (int) $value 
            : (int) basename($value);

        $queryBuilder
            ->andWhere("$alias.technician = :$valueParameter")
            ->setParameter($valueParameter, $technicianId);
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'technician' => [
                'property' => 'technician',
                'type' => 'string|int',
                'required' => false,
                'description' => 'Filter by technician ID or IRI (e.g., 456 or /api/users/456)',
                'openapi' => [
                    'example' => '456',
                ],
            ],
        ];
    }
}