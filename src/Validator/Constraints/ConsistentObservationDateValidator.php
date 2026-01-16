<?php
namespace App\Validator\Constraints;

use App\Entity\Observation;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class ConsistentObservationDateValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$value instanceof Observation) {
            return;
        }

        $observedAt = $value->getObservedAt();
        if (!$observedAt) return;

        // 1. Anti-Anticipation : Pas de date future (+5 minutes de marge pour décalage horloge)
        $now = new \DateTime('+5 minutes');
        if ($observedAt > $now) {
            $this->context->buildViolation($constraint->messageFuture)
                ->atPath('observedAt')
                ->addViolation();
        }

        // 2. Cohérence Visite : Pas avant la date de début de la visite
        $visit = $value->getVisit();
        if ($visit && $visit->getVisitedAt()) {
            // On accepte une petite marge d'erreur (ex: visite créée à 10h00, obs à 09h55 -> OK)
            $visitStart = (clone $visit->getVisitedAt())->modify('-1 hour');
            
            if ($observedAt < $visitStart) {
                 $this->context->buildViolation($constraint->messageTooOld)
                    ->atPath('observedAt')
                    ->addViolation();
            }
        }
    }
}