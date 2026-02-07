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
    const EDIT = 'PROSPECTION_EDIT';
    const DELETE = 'PROSPECTION_DELETE';
    const CREATE = 'PROSPECTION_CREATE';

    public function __construct(private Security $security) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
         return in_array($attribute, [ self::EDIT, self::DELETE, self::CREATE])
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

        switch ($attribute) {
            case self::CREATE:
                // ✅ LOGIQUE POUR LA CRÉATION :
                // Ici, le processeur n'a pas encore injecté le technicien dans l'objet.
                // On vérifie simplement si l'utilisateur a le droit technique de créer (Role).
                return $this->security->isGranted('ROLE_TECHNICIAN');

             case self::EDIT:
                return $this->isAuthor($prospection, $user);
                
            case self::DELETE:
                return $this->isAuthor($prospection, $user);
        }
 
        return true;
    }

    // Petite fonction helper pour éviter la répétition et gérer le null safety
    private function isAuthor(Prospection $prospection, User $user): bool
    {
        // Si pas de technicien assigné, accès refusé par défaut (ou true si vous préférez)
        if ($prospection->getTechnician() === null) {
            return false; 
        }
        return $prospection->getTechnician()->getId() === $user->getId();
    }
}