<?php 
namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\ORM\Mapping\ManyToOne;
use Doctrine\ORM\Mapping\JoinColumn;
use ApiPlatform\Metadata\ApiResource;
use App\Repository\BuildingRepository;
use Doctrine\Common\Collections\Collection;
// src/Entity/Building.php
#[ORM\Entity(repositoryClass: BuildingRepository::class)]
#[ApiResource]
class Building
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column]
    private ?int $maxCapacity = null;

    #[ManyToOne(inversedBy: 'buildings')]
    #[JoinColumn(nullable: false)]
    private ?Customer $customer = null;

    #[ORM\OneToMany(mappedBy: 'building', targetEntity: Flock::class)]
    private Collection $flocks;

    // Getters/Setters...
    public function getId(): ?int { return $this->id; }
    public function getName(): ?string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function getMaxCapacity(): ?int { return $this->maxCapacity; }
    public function setMaxCapacity(?int $maxCapacity): self { $this->maxCapacity = $maxCapacity; return $this; }
    public function getCustomer(): ?Customer { return $this->customer; }
    public function setCustomer(?Customer $customer): self { $this->customer = $customer; return $this; }
    public function getFlocks(): Collection { return $this->flocks; }
    public function setFlocks(Collection $flocks): self { $this->flocks = $flocks; return $this; }
    public function addFlock(Flock $flock): self {
        if (!$this->flocks->contains($flock)) {
            $this->flocks->add($flock);
            $flock->setBuilding($this);
        }
        return $this;
    }
    public function removeFlock(Flock $flock): self {
        if ($this->flocks->removeElement($flock)) {
            // set the owning side to null (unless already changed)
            if ($flock->getBuilding() === $this) {
                $flock->setBuilding(null);
            }
        }
        return $this;
    }
    public function __toString(): string {
        return $this->name ?? '';
    }
}