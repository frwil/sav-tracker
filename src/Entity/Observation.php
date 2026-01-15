<?php
// src/Entity/Observation.php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Patch;
use App\Repository\ObservationRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: ObservationRepository::class)]
#[ApiResource(
    operations: [
        new Get(),
        new GetCollection(),
        new Post(),
        new Patch()
    ],
    normalizationContext: ['groups' => ['observation:read']],
    denormalizationContext: ['groups' => ['observation:write']]
)]
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
}