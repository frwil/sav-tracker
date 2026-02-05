<?php

namespace App\State;

use App\Entity\Consultation;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class ConsultationProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private Security $security
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        // Si c'est une création de consultation et que le technicien n'est pas défini
        if ($data instanceof Consultation && $data->getTechnician() === null) {
            $user = $this->security->getUser();
            if ($user) {
                $data->setTechnician($user);
            }
        }

        // On délègue la persistance réelle à Doctrine
        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}