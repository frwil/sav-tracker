<?php

namespace App\Validator\Constraints;

use App\Entity\Visit;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class SequentialVisitDateValidator extends ConstraintValidator
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$value instanceof Visit) {
            throw new UnexpectedTypeException($value, Visit::class);
        }

        /** @var Visit $newVisit */
        $newVisit = $value;
        $customer = $newVisit->getCustomer();
        $newDate = $newVisit->getVisitedAt();

        if (!$customer || !$newDate) {
            return; // On laisse les autres validateurs gérer les champs vides
        }

        // 1. On cherche la DERNIÈRE visite enregistrée pour ce client
        // On exclut la visite actuelle (cas de l'édition)
        $qb = $this->em->getRepository(Visit::class)->createQueryBuilder('v');
        $qb->select('v')
           ->where('v.customer = :customer')
           ->andWhere('v.id != :currentId') // Ignorer soi-même si modification
           ->setParameter('customer', $customer)
           ->setParameter('currentId', $newVisit->getId() ?? 0) // 0 si création
           ->orderBy('v.visitedAt', 'DESC')
           ->setMaxResults(1);

        $lastVisit = $qb->getQuery()->getOneOrNullResult();

        // 2. Si une visite précédente existe, on compare les dates
        if ($lastVisit) {
            $lastDate = $lastVisit->getVisitedAt();

            // Règle : Nouvelle date < Dernière date = INTERDIT
            if ($newDate < $lastDate) {
                $this->context->buildViolation($constraint->message)
                    ->atPath('visitedAt')
                    ->setParameter('{{ date }}', $newDate->format('d/m/Y'))
                    ->setParameter('{{ last_date }}', $lastDate->format('d/m/Y'))
                    ->addViolation();
            }
        }
    }
}