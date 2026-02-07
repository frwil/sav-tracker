<?php

namespace App\Security\Voter;

use App\Entity\Consultation;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Bundle\SecurityBundle\Security;

class ConsultationVoter extends Voter
{
    const EDIT = 'PROSPECTION_EDIT';
    const DELETE = 'PROSPECTION_DELETE';
    const CREATE = 'PROSPECTION_CREATE';

    public function __construct(private Security $security) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [ self::EDIT, self::DELETE, self::CREATE])
            && $subject instanceof Consultation;

         //return true; // Permet de tester le vote sans se soucier du sujet
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        /** @var Consultation $consultation */
        $consultation = $subject;

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
                return $this->isAuthor($consultation, $user);
                
            case self::DELETE:
                return $this->isAuthor($consultation, $user);
        }

        return true;
    }

    // Petite fonction helper pour éviter la répétition et gérer le null safety
    private function isAuthor(Consultation $consultation, User $user): bool
    {
        // Si pas de technicien assigné, accès refusé par défaut (ou true si vous préférez)
        if ($consultation->getTechnician() === null) {
            return false; 
        }
        return $consultation->getTechnician()->getId() === $user->getId();
    }
}