<?php
namespace App\Validator\Constraints;

use Symfony\Component\Validator\Constraint;

#[\Attribute]
class ConsistentObservationDate extends Constraint
{
    public string $message = "La date d'observation doit être comprise dans une plage de temps raisonnable autour de la date de visite."; // Message générique
    public string $messageFuture = "La date d'observation ne peut pas être dans le futur.";
    public string $messageTooOld = "Impossible d'ajouter une observation antérieure à la visite elle-même.";
    
    public function getTargets(): string
    {
        return self::CLASS_CONSTRAINT;
    }
}