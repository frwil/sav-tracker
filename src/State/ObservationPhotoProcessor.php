<?php
// src/State/ObservationPhotoProcessor.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\ObservationPhoto;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class ObservationPhotoProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        #[Autowire('%kernel.project_dir%/public/uploads/photos')]
        private string $uploadDir
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof ObservationPhoto && $data->file instanceof UploadedFile) {
            // 1. Créer le dossier s'il n'existe pas
            if (!is_dir($this->uploadDir)) {
                mkdir($this->uploadDir, 0777, true);
            }

            // 2. Générer un nom de fichier unique
            $fileName = uniqid() . '.' . $data->file->guessExtension();

            // 3. Déplacer le fichier
            $data->file->move($this->uploadDir, $fileName);

            // 4. Enregistrer l'URL relative dans l'entité
            $data->contentUrl = '/uploads/photos/' . $fileName;
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}