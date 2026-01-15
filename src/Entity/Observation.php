<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use App\Repository\ObservationRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: ObservationRepository::class)]
#[ApiResource]
class Observation
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['visit:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['visit:read', 'visit:write'])]
    private ?string $type = null; // ex: "Sanitaire", "Alimentation"

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['visit:read', 'visit:write'])]
    private ?string $description = null;

    #[ORM\Column]
    #[Groups(['visit:read', 'visit:write'])]
    private bool $isResolved = false;

    #[ORM\ManyToOne(inversedBy: 'observations')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Visit $visit = null;

    public function getId(): ?int { return $this->id; }

    public function getType(): ?string { return $this->type; }
    public function setType(string $type): self { $this->type = $type; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): self { $this->description = $description; return $this; }

    public function isResolved(): ?bool { return $this->isResolved; }
    public function setIsResolved(bool $isResolved): self { $this->isResolved = $isResolved; return $this; }

    public function getVisit(): ?Visit { return $this->visit; }
    public function setVisit(?Visit $visit): self { $this->visit = $visit; return $this; }
}