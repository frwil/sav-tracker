<?php
namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

use ApiPlatform\Metadata\ApiResource;
use App\Repository\SpeculationRepository;
// src/Entity/Speculation.php
#[ORM\Entity(repositoryClass: SpeculationRepository::class)]
#[ApiResource]
class Speculation
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 100)]
    private ?string $label = null; // ex: "Poulet de chair"

    // Getters/Setters...
    public function getId(): ?int { return $this->id; }
    public function getLabel(): ?string { return $this->label; }
    public function setLabel(?string $label): self { $this->label = $label; return $this; }
}