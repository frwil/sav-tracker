<?php

namespace App\Doctrine;

use App\Entity\User;
use App\Entity\Visit;
use App\Entity\Customer;
use App\Entity\Prospection;
use App\Entity\Consultation;
use Doctrine\ORM\QueryBuilder;
use ApiPlatform\Metadata\Operation;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryItemExtensionInterface;
use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;

class CurrentUserExtension implements QueryCollectionExtensionInterface, QueryItemExtensionInterface
{
    public function __construct(
        private Security $security,
        private LoggerInterface $logger
    ) {}

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
        return;
    // 1. Entités concernées
        $allowed = [Visit::class, Customer::class, Prospection::class, Consultation::class];
        if (!in_array($resourceClass, $allowed, true)) {
            return;
        }
        
        // 2. Check admin - ils voient tout
        if ($this->security->isGranted('ROLE_ADMIN') ||
            $this->security->isGranted('ROLE_SUPER_ADMIN') ||
            $this->security->isGranted('ROLE_OPERATOR')) {
            return;
        }

return;

        // 3. Récupérer l'utilisateur
        $user = $this->security->getUser();
        
        if (!$user instanceof User) {
            return;
        }

        $userId = $user->getId();

        // 4. Get root alias
        $rootAliases = $queryBuilder->getRootAliases();
        if (empty($rootAliases)) {
            return;
        }
        $rootAlias = $rootAliases[0];

        
        // 5. Apply filter selon l'entité
        switch ($resourceClass) {
            case Customer::class:
                // LEFT JOIN pour inclure les clients non affectés (visibles par tous)
                $queryBuilder
                    ->leftJoin(sprintf('%s.affectedTo', $rootAlias), 'cust_user')
                    ->andWhere('cust_user.id = :current_user_id OR cust_user.id IS NULL')
                    ->setParameter('current_user_id', $userId);
                break;

            case Visit::class:
                // INNER JOIN - uniquement ses visites
                $queryBuilder
                    ->join(sprintf('%s.technician', $rootAlias), 'visit_tech')
                    ->andWhere('visit_tech.id = :current_user_id')
                    ->setParameter('current_user_id', $userId);
                break;

            case Prospection::class:
                // INNER JOIN - uniquement ses prospections (sans tech = invisible)
                $queryBuilder
                    ->join(sprintf('%s.technician', $rootAlias), 'prosp_tech')
                    ->andWhere('prosp_tech.id = :current_user_id')
                    ->setParameter('current_user_id', $userId);
                break;

            case Consultation::class:
                // INNER JOIN - uniquement ses consultations (sans tech = invisible)
                $queryBuilder
                    ->join(sprintf('%s.technician', $rootAlias), 'consult_tech')
                    ->andWhere('consult_tech.id = :current_user_id')
                    ->setParameter('current_user_id', $userId);
                break;
        }
    }
}