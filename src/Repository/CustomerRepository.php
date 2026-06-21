<?php
namespace App\Repository;

use App\Entity\Customer;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bundle\SecurityBundle\Security;

class CustomerRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private Security $security
    ) {
        parent::__construct($registry, Customer::class);
    }

    /**
     * Récupère tous les clients pour l'utilisateur courant.
     * - Admin : voit tout
     * - User : voit seulement les clients où il est affectedTo
     */
    public function findForCurrentUser(): array
    {
        if ($this->isAdmin()) {
            return $this->findAll();
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return [];
        }

        return $this->createQueryBuilder('c')
            ->where('c.affectedTo = :userId')
            ->setParameter('userId', $user->getId())
            ->getQuery()
            ->getResult();
    }

    /**
     * Récupère un client par ID si accessible par l'utilisateur courant.
     */
    public function findOneForCurrentUser(int $id): ?Customer
    {
        if ($this->isAdmin()) {
            return $this->find($id);
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return null;
        }

        return $this->createQueryBuilder('c')
            ->where('c.id = :id')
            ->andWhere('c.affectedTo = :userId')
            ->setParameter('id', $id)
            ->setParameter('userId', $user->getId())
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function isAdmin(): bool
    {
        return $this->security->isGranted('ROLE_ADMIN') ||
               $this->security->isGranted('ROLE_SUPER_ADMIN');
    }
}
