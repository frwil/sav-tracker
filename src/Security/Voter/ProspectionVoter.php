<?php

namespace App\Security\Voter;

use App\Entity\Prospection;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Bundle\SecurityBundle\Security;

class ProspectionVoter extends Voter
{
    const VIEW = 'PROSPECTION_VIEW';
    const EDIT = 'PROSPECTION_EDIT';
    const DELETE = 'PROSPECTION_DELETE';

    public function __construct(private Security $security) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE])
            && $subject instanceof Prospection;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        /** @var Prospection $prospection */
        $prospection = $subject;

        // Les Admins peuvent tout faire
        if ($this->security->isGranted('ROLE_ADMIN') || $this->security->isGranted('ROLE_SUPER_ADMIN')) {
            return true;
        }

        // Vérification : L'utilisateur est-il l'auteur ?
        $isAuthor = $prospection->getTechnician()->getId() === $user->getId();

        switch ($attribute) {
            case self::VIEW:
                return $isAuthor; // Seul l'auteur (ou admin) peut voir
            case self::EDIT:
                return $isAuthor; // Seul l'auteur peut modifier
            case self::DELETE:
                return $isAuthor; // Seul l'auteur peut supprimer
        }

        return false;
    }
}