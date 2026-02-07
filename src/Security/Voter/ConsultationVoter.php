<?php

namespace App\Security\Voter;

use App\Entity\User;
use App\Entity\Consultation;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;

class ConsultationVoter extends Voter
{
    const VIEW = 'CONSULTATION_VIEW';
    const EDIT = 'CONSULTATION_EDIT';
    const DELETE = 'CONSULTATION_DELETE';
    const CREATE = 'CONSULTATION_CREATE';

    public function __construct(private Security $security) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        // ✅ CORRECTION : Supporte CREATE même sans subject (null) ou avec une instance
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE, self::CREATE])
            && ($subject instanceof Consultation || $subject === null);
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        
        if (!$user instanceof User) {
            return false;
        }

        // Les Admins peuvent tout faire
        if ($this->security->isGranted('ROLE_ADMIN') || 
            $this->security->isGranted('ROLE_SUPER_ADMIN')) {
            return true;
        }

        switch ($attribute) {
            case self::CREATE:
                // ✅ Vérifie que l'utilisateur est un technicien
                return $this->canCreate($user);

            case self::VIEW:
                /** @var Consultation $consultation */
                $consultation = $subject;
                return $this->canView($consultation, $user);

            case self::EDIT:
                /** @var Consultation $consultation */
                $consultation = $subject;
                return $this->canEdit($consultation, $user);
                
            case self::DELETE:
                /** @var Consultation $consultation */
                $consultation = $subject;
                return $this->canDelete($consultation, $user);
        }

        return false;
    }

    private function canCreate(User $user): bool
    {
        // Tout utilisateur authentifié peut créer une consultation
        // Ou vérifiez un rôle spécifique : ROLE_TECHNICIAN
        return $this->security->isGranted('ROLE_TECHNICIAN') || 
               $this->security->isGranted('ROLE_USER');
    }

    private function canView(Consultation $consultation, User $user): bool
    {
        // Admin déjà géré, ici on est sûr que c'est un user normal
        
        // Si pas de technicien assigné, visible par tous (ou selon votre logique)
        if ($consultation->getTechnician() === null) {
            return false; // ou true si vous voulez que les sans-technicien soient visibles
        }

        // Le technicien assigné peut voir
        return $consultation->getTechnician()->getId() === $user->getId();
    }

    private function canEdit(Consultation $consultation, User $user): bool
    {
        // Même logique que VIEW
        return $this->isAuthor($consultation, $user);
    }

    private function canDelete(Consultation $consultation, User $user): bool
    {
        // Même logique que VIEW
        return $this->isAuthor($consultation, $user);
    }

    private function isAuthor(Consultation $consultation, User $user): bool
    {
        if ($consultation->getTechnician() === null) {
            return false;
        }
        
        return $consultation->getTechnician()->getId() === $user->getId();
    }
}