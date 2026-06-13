<?php

namespace App\Security\Voter;

use App\Entity\SalesVisit;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class SalesVisitVoter extends Voter
{
    public const EDIT = 'SALES_VISIT_EDIT';
    public const CLOSE = 'SALES_VISIT_CLOSE';
    public const DELETE = 'SALES_VISIT_DELETE';

    public function __construct(private Security $security) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::EDIT, self::CLOSE, self::DELETE])
            && $subject instanceof SalesVisit;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        /** @var SalesVisit $visit */
        $visit = $subject;

        // Admin et Super Admin ont tous les droits
        if ($this->security->isGranted('ROLE_ADMIN') || $this->security->isGranted('ROLE_SUPER_ADMIN')) {
            return true;
        }

        // La suppression est réservée aux admins
        if ($attribute === self::DELETE) {
            return false;
        }

        // Visite archivée → personne ne peut modifier
        if (!$visit->isActivated()) {
            return false;
        }

        // Visite déjà fermée → personne ne peut modifier
        if ($visit->isClosed()) {
            return false;
        }

        // Seul le commercial assigné peut modifier sa visite
        if (!$visit->getSalesRep() || $visit->getSalesRep()->getId() !== $user->getId()) {
            return false;
        }

        // Fenêtre d'édition de 24h (vs 48h pour les techniciens)
        // Les commerciaux doivent être plus réactifs dans leurs rapports
        if ($attribute === self::EDIT) {
            $now = new \DateTime();
            $interval = $now->diff($visit->getVisitedAt());
            if ($interval->days >= 1) {
                return false;
            }
        }

        // Pour la clôture, on est plus souple (48h)
        // car le commercial peut avoir besoin de finaliser après coup
        if ($attribute === self::CLOSE) {
            $now = new \DateTime();
            $interval = $now->diff($visit->getVisitedAt());
            if ($interval->days >= 2) {
                return false;
            }
        }

        return true;
    }
}
