<?php

namespace App\Doctrine;

use App\Entity\User;
use App\Entity\Visit;
use App\Entity\Customer;
use App\Entity\Prospection; // ✅ 1. Import de la nouvelle entité
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
        // ✅ 2. Liste des entités concernées par le filtre utilisateur
        if (!in_array($resourceClass, [Visit::class, Customer::class, Prospection::class])) {
            return;
        }

        // 3. Les Admins / Super Admins / Opérateurs voient TOUT
        if ($this->security->isGranted('ROLE_ADMIN') || 
            $this->security->isGranted('ROLE_SUPER_ADMIN') || 
            $this->security->isGranted('ROLE_OPERATOR')) {
            return;
        }

        // 4. On récupère l'utilisateur connecté
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return;
        }

        $rootAlias = $queryBuilder->getRootAliases()[0];

        // --- RÈGLES DE FILTRAGE ---

        // Cas A : Les Clients (Affectés à l'utilisateur)
        if ($resourceClass === Customer::class) {
            $queryBuilder->andWhere(sprintf('%s.affectedTo = :current_user', $rootAlias));
            $queryBuilder->setParameter('current_user', $user);
        }

        // Cas B : Les Visites (Faites par l'utilisateur)
        if ($resourceClass === Visit::class) {
            $queryBuilder->andWhere(sprintf('%s.technician = :current_user', $rootAlias));
            $queryBuilder->setParameter('current_user', $user);
        }

        // ✅ Cas C : Les Prospections (Faites par l'utilisateur)
        if ($resourceClass === Prospection::class) {
            $queryBuilder->andWhere(sprintf('%s.technician = :current_user', $rootAlias));
            $queryBuilder->setParameter('current_user', $user);
        }
    }
}