<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Repository\ObservationPhotoRepository; // Assurez-vous que ce repository existe
use App\State\ObservationPhotoProcessor;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ApiResource(
    operations: [
        new GetCollection(normalizationContext: ['groups' => ['photo:read']]),
        new Get(normalizationContext: ['groups' => ['photo:read']]),
        new Post(
            inputFormats: ['multipart' => ['multipart/form-data']], // ✅ Accepte l'envoi de fichiers
            processor: ObservationPhotoProcessor::class // ✅ Notre logique d'upload
        )
    ],
    normalizationContext: ['groups' => ['photo:read']]
)]
#[ORM\Entity(repositoryClass: ObservationPhotoRepository::class)]
class ObservationPhoto
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['visit:detail', 'observation:read', 'photo:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['visit:detail', 'observation:read', 'photo:read'])]
    public ?string $contentUrl = null;

    /**
     * Une photo peut être liée à une observation spécifique
     */
    #[ORM\ManyToOne(inversedBy: 'photos')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Observation $observation = null;

    public $file = null;

    /**
     * Ou être liée directement à la visite (Photo générale)
     * inversedBy: 'photos' correspond à la propriété dans l'entité Visit
     */
    #[ORM\ManyToOne(inversedBy: 'photos')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    #[Groups(['photo:read'])]
    private ?Visit $visit = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getContentUrl(): ?string
    {
        return $this->contentUrl;
    }

    public function setContentUrl(?string $contentUrl): self
    {
        $this->contentUrl = $contentUrl;
        return $this;
    }

    public function getObservation(): ?Observation
    {
        return $this->observation;
    }

    public function setObservation(?Observation $observation): self
    {
        $this->observation = $observation;
        return $this;
    }

    public function getVisit(): ?Visit
    {
        return $this->visit;
    }

    public function setVisit(?Visit $visit): self
    {
        $this->visit = $visit;
        return $this;
    }
}
