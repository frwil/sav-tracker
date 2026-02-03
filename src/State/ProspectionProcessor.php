<?php

namespace App\State;

use App\Entity\Prospection;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class ProspectionProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private Security $security
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        // Si c'est une création de prospection et que le technicien n'est pas défini
        if ($data instanceof Prospection && $data->getTechnician() === null) {
            $user = $this->security->getUser();
            if ($user) {
                $data->setTechnician($user);
            }
        }

        // On laisse API Platform faire la sauvegarde normale
        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}