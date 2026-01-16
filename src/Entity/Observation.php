<?php
// src/Entity/Observation.php

namespace App\Entity;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use Doctrine\DBAL\Types\Types;
use ApiPlatform\Metadata\Patch;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\ObservationRepository;
use Symfony\Component\Serializer\Attribute\Groups;
use App\Validator\Constraints\ConsistentObservationDate;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;

#[ORM\Entity(repositoryClass: ObservationRepository::class)]
#[UniqueEntity(
    fields: ['visit', 'flock'], 
    message: "Une observation a déjà été saisie pour cette bande lors de cette visite."
)]
#[ApiResource(
    operations: [
        new Get(),
        new GetCollection(),
        new Post(
            security: "is_granted('OBSERVATION_CREATE', object)"
        ),
        new Patch(
            security: "is_granted('OBSERVATION_EDIT', object)"
        )
    ],
    normalizationContext: ['groups' => ['observation:read']],
    denormalizationContext: ['groups' => ['observation:write']]
)]
#[ConsistentObservationDate]
class Observation
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['observation:read', 'visit:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'observations')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['observation:read', 'observation:write'])]
    private ?Visit $visit = null;

    // Lien vers la Bande concernée (Indispensable pour savoir de quoi on parle)
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['observation:read', 'observation:write', 'visit:read'])]
    private ?Flock $flock = null;

    // --- CHAMPS COMMUNS A TOUTES LES SPECULATIONS ---

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['observation:read', 'observation:write', 'visit:read'])]
    private ?string $concerns = null; // Préoccupations du client

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['observation:read', 'observation:write', 'visit:read'])]
    private ?string $observation = null; // Observations de la visite (Analyse)

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['observation:read', 'observation:write', 'visit:read'])]
    private ?string $recommendations = null; // Recommandations du technicien

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['observation:read', 'observation:write', 'visit:read'])]
    private ?string $problems = null; // Difficultés rencontrées

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['observation:read', 'observation:write', 'visit:read'])]
    private ?string $generalComment = null; // Commentaire général

    // --- DONNEES SPECIFIQUES (JSON) ---
    // C'est ici que l'on stockera : Poids, Mortalité, Aliment, Densité, etc.
    // La structure du JSON changera selon la spéculation (Poisson vs Porc)
    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    #[Groups(['observation:read', 'observation:write', 'visit:read'])]
    private array $data = [];

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['observation:read', 'visit:read'])] 
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)] // Mutable car peut être ajustée si besoin
    #[Groups(['observation:read', 'observation:write', 'visit:read'])] // 'write' autorisé !
    private ?\DateTimeInterface $observedAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        // Le serveur marque toujours l'heure de réception
        $this->createdAt = new \DateTimeImmutable();
        
        // Si le mobile n'a pas envoyé de date (ex: bug), on met la date serveur par défaut
        if ($this->observedAt === null) {
            $this->observedAt = new \DateTime();
        }
    }

    public function getId(): ?int { return $this->id; }

    public function getVisit(): ?Visit { return $this->visit; }
    public function setVisit(?Visit $visit): self { $this->visit = $visit; return $this; }

    public function getFlock(): ?Flock { return $this->flock; }
    public function setFlock(?Flock $flock): self { $this->flock = $flock; return $this; }

    public function getConcerns(): ?string { return $this->concerns; }
    public function setConcerns(?string $concerns): self { $this->concerns = $concerns; return $this; }

    public function getObservation(): ?string { return $this->observation; }
    public function setObservation(?string $observation): self { $this->observation = $observation; return $this; }

    public function getRecommendations(): ?string { return $this->recommendations; }
    public function setRecommendations(?string $recommendations): self { $this->recommendations = $recommendations; return $this; }

    public function getProblems(): ?string { return $this->problems; }
    public function setProblems(?string $problems): self { $this->problems = $problems; return $this; }

    public function getGeneralComment(): ?string { return $this->generalComment; }
    public function setGeneralComment(?string $generalComment): self { $this->generalComment = $generalComment; return $this; }

    public function getData(): array { return $this->data; }
    public function setData(array $data): self { $this->data = $data; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getObservedAt(): ?\DateTimeInterface { return $this->observedAt; }
    public function setObservedAt(\DateTimeInterface $observedAt): self { $this->observedAt = $observedAt; return $this; }
    public function __toString(): string
    {
        return 'Observation #' . $this->id. ' - Bande: ' . ($this->flock ? $this->flock->getName() : 'N/A') . ' - Visite #' . ($this->visit ? $this->visit->getId() : 'N/A');
    }
}