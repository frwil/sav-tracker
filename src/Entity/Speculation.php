<?php
namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiFilter;

use ApiPlatform\Metadata\ApiResource;
use App\Repository\SpeculationRepository;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Attribute\Groups;
// src/Entity/Speculation.php
#[ORM\Entity(repositoryClass: SpeculationRepository::class)]
#[ApiResource]
#[ApiFilter(SearchFilter::class, properties: ['id'=>'exact'])]
class Speculation
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['visit:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 100)]
    #[Groups(['visit:read','flock:read','customer:read'])]
    private ?string $name = null; // ex: "Poulet de chair"

    // Getters/Setters...
    public function getId(): ?int { return $this->id; }
    public function getName(): ?string { return $this->name; }
    public function setName(?string $name): self { $this->name = $name; return $this; }
}