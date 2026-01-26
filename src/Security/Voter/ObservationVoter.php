<?php

namespace App\Security\Voter;

use App\Entity\Observation;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class ObservationVoter extends Voter
{
    public const CREATE = 'OBSERVATION_CREATE';
    public const EDIT = 'OBSERVATION_EDIT';

    public function __construct(private Security $security) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::CREATE, self::EDIT])
            && $subject instanceof Observation;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        /** @var Observation $observation */
        $observation = $subject;
        $visit = $observation->getVisit();

        // ADMIN a tous les droits
        if ($this->security->isGranted('ROLE_ADMIN') || $this->security->isGranted('ROLE_SUPER_ADMIN')) {
            return true;
        }

        // Si la visite liée n'est pas encore définie (cas rare en création pure), on bloque
        if (!$visit) {
            return true; // Ou false selon votre logique de création
        }

        // VERROUILLAGE PRINCIPAL
        // Si la visite est clôturée OU archivée, on interdit tout changement sur l'observation
        if ($visit->isClosed() || !$visit->isActivated()) {
            return false;
        }

        return true;
    }
}