<?php

namespace App\Security\Voter;

use App\Entity\Visit;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class VisitVoter extends Voter
{
    public const EDIT = 'VISIT_EDIT';
    public const CLOSE = 'VISIT_CLOSE';

    public function __construct(private Security $security) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::EDIT, self::CLOSE])
            && $subject instanceof Visit;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();
        // Si l'utilisateur n'est pas connecté, on refuse
        if (!$user instanceof User) {
            return false;
        }

        /** @var Visit $visit */
        $visit = $subject;

        // L'ADMIN peut tout faire
        if ($this->security->isGranted('ROLE_ADMIN')) {
            return true;
        }

        // Règles pour le TECHNICIEN
        switch ($attribute) {
            case self::EDIT:
            case self::CLOSE:
                // Interdit si archivé
                if (!$visit->isActivated()) {
                    return false;
                }
                
                // Interdit si déjà clôturé
                if ($visit->isClosed()) {
                    return false;
                }
                
                // Vérifier la règle des 48h
                $now = new \DateTime();
                $interval = $now->diff($visit->getVisitedAt());
                if ($interval->days >= 2) {
                    return false;
                }

                return true;
        }

        return false;
    }
}