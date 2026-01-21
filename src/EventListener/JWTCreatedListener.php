<?php

namespace App\EventListener;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;

class JWTCreatedListener
{
    /**
     * @param JWTCreatedEvent $event
     *
     * @return void
     */
    public function onJWTCreated(JWTCreatedEvent $event)
    {
        /** @var User $user */
        $user = $event->getUser();

        // Récupération du payload existant
        $payload = $event->getData();

        // Ajout de l'ID de l'utilisateur
        $payload['id'] = $user->getId();
        
        // On peut aussi forcer l'ajout des rôles ou du nom complet si besoin
        $payload['roles'] = $user->getRoles();
        if (method_exists($user, 'getFullname')) {
            $payload['fullname'] = $user->getFullname();
        }

        // Mise à jour du payload
        $event->setData($payload);
    }
}