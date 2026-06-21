<?php

namespace App\Doctrine;

use App\Entity\User;
use App\Entity\Visit;
use App\Entity\Customer;
use App\Entity\SalesVisit;
use Doctrine\ORM\QueryBuilder;
use ApiPlatform\Metadata\Operation;
use Symfony\Bundle\SecurityBundle\Security;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;

class CurrentUserExtension implements QueryCollectionExtensionInterface, QueryItemExtensionInterface
{
    public function __construct(private Security $security)
    {
    }

    public function applyToCollection(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, Operation $operation = null, array $context = []): void
    {
        $this->addWhere($queryBuilder, $resourceClass);
    }

    public function applyToItem(QueryBuilder $queryBuilder, QueryNameGeneratorInterface $queryNameGenerator, string $resourceClass, array $identifiers, Operation $operation = null, array $context = []): void
    {
        $this->addWhere($queryBuilder, $resourceClass);
    }

    private function addWhere(QueryBuilder $queryBuilder, string $resourceClass): void
    {
        // Admin / Super Admin voient tout
        if ($this->security->isGranted('ROLE_ADMIN') || $this->security->isGranted('ROLE_SUPER_ADMIN')) {
            return;
        }

        $user = $this->security->getUser();
        if (null === $user || !$user instanceof User) {
            return;
        }

        $rootAlias = $queryBuilder->getRootAliases()[0];

        // 1. Visites technicien : filtrer par technician = current_user
        if ($resourceClass === Visit::class) {
            $queryBuilder->andWhere(sprintf('%s.technician = :current_user', $rootAlias));
            $queryBuilder->setParameter('current_user', $user);
        }

        // 2. Visites commerciales : filtrer par salesRep = current_user
        if ($resourceClass === SalesVisit::class) {
            $queryBuilder->andWhere(sprintf('%s.salesRep = :current_user', $rootAlias));
            $queryBuilder->setParameter('current_user', $user);
        }

        // 3. Clients : filtrer par affectedTo = current_user
        if ($resourceClass === Customer::class) {
            $queryBuilder->andWhere(sprintf('%s.affectedTo = :current_user', $rootAlias));
            $queryBuilder->setParameter('current_user', $user);
        }
    }
}
