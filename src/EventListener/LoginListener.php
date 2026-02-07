<?php

namespace App\EventListener;

use App\Entity\AuditLog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\Security\Http\Event\InteractiveLoginEvent;
use Symfony\Component\Security\Http\Event\LoginFailureEvent;

class LoginListener
{
    public function __construct(
        private EntityManagerInterface $entityManager
    ) {}

    #[AsEventListener(event: InteractiveLoginEvent::class)]
    public function onLoginSuccess(InteractiveLoginEvent $event): void
    {
        $user = $event->getAuthenticationToken()->getUser();
        
        if (!$user instanceof User) {
            return;
        }

        $this->saveLog('LOGIN_SUCCESS', $user->getUserIdentifier(), null);
    }

    #[AsEventListener(event: LoginFailureEvent::class)]
    public function onLoginFailure(LoginFailureEvent $event): void
    {
        $passport = $event->getPassport();
        $username = 'Unknown';
        
        // Essayer de récupérer le nom d'utilisateur tenté
        if ($passport && method_exists($passport, 'getBadge')) {
             // Logique dépendante de votre système d'auth, souvent dans les badges
             $username = 'Attempted Login'; 
        }

        // On logue l'erreur
        $exception = $event->getException();
        $details = ['error' => $exception ? $exception->getMessage() : 'Unknown error'];

        $this->saveLog('LOGIN_FAILURE', $username, $details);
    }

    private function saveLog(string $action, string $username, ?array $details): void
    {
        $log = new AuditLog();
        $log->setAction($action);
        $log->setEntityClass('Security');
        $log->setUsername($username);
        $log->setChanges($details);

        $this->entityManager->persist($log);
        $this->entityManager->flush();
    }
}