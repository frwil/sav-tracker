<?php 
namespace App\Entity;

use App\Entity\Building;
use Doctrine\ORM\Mapping as ORM;

use App\Repository\FlockRepository;
use ApiPlatform\Metadata\ApiResource;
use App\Validator\Constraints\BuildingAvailable;

// src/Entity/Flock.php
#[ORM\Entity(repositoryClass: FlockRepository::class)]
#[ApiResource]
#[BuildingAvailable] // Contrainte personnalisée
class Flock
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column]
    private ?int $subjectCount = null; // <= capacity du bâtiment

    #[ORM\Column(type: 'datetime')]
    private ?\DateTimeInterface $startDate = null;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $endDate = null;

    #[ORM\Column]
    private bool $closed = false;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?Speculation $speculation = null; // Choix unique

    #[ORM\ManyToOne(inversedBy: 'flocks')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Building $building = null;

    // Getters/Setters...

    public function getId(): ?int { return $this->id; }
    public function getName(): ?string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function getSubjectCount(): ?int { return $this->subjectCount; } 
    public function setSubjectCount(?int $subjectCount): self { $this->subjectCount = $subjectCount; return $this; }
    public function getStartDate(): ?\DateTimeInterface { return $this->startDate; }
    public function setStartDate(?\DateTimeInterface $startDate): self { $this->startDate = $startDate; return $this; }
    public function getEndDate(): ?\DateTimeInterface { return $this->endDate; }
    public function setEndDate(?\DateTimeInterface $endDate): self { $this->endDate = $endDate; return $this; }
    public function isClosed(): bool { return $this->closed; }
    public function setClosed(bool $closed): self { $this->closed = $closed; return $this; }
    public function getSpeculation(): ?Speculation { return $this->speculation; }
    public function setSpeculation(?Speculation $speculation): self { $this->speculation = $speculation; return $this; }
    public function getBuilding(): ?Building { return $this->building; }
    public function setBuilding(?Building $building): self { $this->building = $building; return $this; }
    public function __toString(): string { return $this->name ?? ''; }
}