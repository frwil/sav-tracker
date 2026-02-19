<?php
// src/ApiPlatform/Filter/CustomerFilter.php

namespace App\ApiPlatform\Filter;

use ApiPlatform\Doctrine\Orm\Filter\AbstractFilter;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use Doctrine\ORM\QueryBuilder;

final class CustomerFilter extends AbstractFilter
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
        if ($property !== 'customer') {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $valueParameter = $queryNameGenerator->generateParameterName('customer');

        // Accepte soit "123" soit "/api/customers/123"
        $customerId = is_numeric($value) 
            ? (int) $value 
            : (int) basename($value);

        $queryBuilder
            ->andWhere("$alias.customer = :$valueParameter")
            ->setParameter($valueParameter, $customerId);
    }

    public function getDescription(string $resourceClass): array
    {
        return [
            'customer' => [
                'property' => 'customer',
                'type' => 'string|int',
                'required' => false,
                'description' => 'Filter by customer ID or IRI (e.g., 123 or /api/customers/123)',
                'openapi' => [
                    'example' => '123',
                ],
            ],
        ];
    }
}