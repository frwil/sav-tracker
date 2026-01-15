<?php 
namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\ORM\Mapping\OneToMany;
use Doctrine\ORM\Mapping\ManyToMany;
use ApiPlatform\Metadata\ApiResource;
use App\Repository\CustomerRepository;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;
use Symfony\Component\Serializer\Attribute\Groups;
// src/Entity/Customer.php
#[ORM\Entity(repositoryClass: CustomerRepository::class)]
#[ApiResource(normalizationContext: ['groups' => ['customer:read']])]
class Customer
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['customer:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['customer:read'])]
    private ?string $name = null;

    #[ORM\Column(length: 255)]
    private ?string $zone = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $exactLocation = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $code = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $erpCode = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $erpName = null;

    // Type de client : Eleveur est toujours vrai. Provendier est optionnel.
    #[ORM\Column]
    private bool $isDealer = false; 

    #[ORM\Column]
    private bool $isDirectBuyer = true;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $relayPointName = null;

    #[ManyToMany(targetEntity: Speculation::class)]
    private Collection $speculations; // Choix multiple pour le profil client

    #[OneToMany(mappedBy: 'customer', targetEntity: Building::class)]
    private Collection $buildings;

    public function __construct() {
        $this->speculations = new ArrayCollection();
        $this->buildings = new ArrayCollection();
    }
    // Getters/Setters...

    public function getId(): ?int { return $this->id; }
    public function getName(): ?string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function getZone(): ?string { return $this->zone; }
    public function setZone(string $zone): self { $this->zone = $zone; return $this; }
    public function getExactLocation(): ?string { return $this->exactLocation; }
    public function setExactLocation(?string $exactLocation): self { $this->exactLocation = $exactLocation; return $this; }
    public function isDealer(): bool { return $this->isDealer; }
    public function setIsDealer(bool $isDealer): self { $this->isDealer = $isDealer; return $this; }
    public function isDirectBuyer(): bool { return $this->isDirectBuyer; }
    public function setIsDirectBuyer(bool $isDirectBuyer): self { $this->isDirectBuyer = $isDirectBuyer; return $this; }
    public function getRelayPointName(): ?string { return $this->relayPointName; }
    public function setRelayPointName(?string $relayPointName): self { $this->relayPointName = $relayPointName; return $this; }
    public function getSpeculations(): Collection { return $this->speculations; }
    public function getCode(): ?string { return $this->code; }
    public function setCode(?string $code): self { $this->code = $code; return $this; }
    public function getErpCode(): ?string { return $this->erpCode; }
    public function setErpCode(?string $erpCode): self { $this->erpCode = $erpCode; return $this; }
    public function getErpName(): ?string { return $this->erpName; }
    public function setErpName(?string $erpName): self { $this->erpName = $erpName; return $this; }
    public function addSpeculation(Speculation $speculation): self {
        if (!$this->speculations->contains($speculation)) {
            $this->speculations[] = $speculation;
        }
        return $this;
    }
    public function removeSpeculation(Speculation $speculation): self {
        $this->speculations->removeElement($speculation);
        return $this;
    }
    public function getBuildings(): Collection { return $this->buildings; }
    public function addBuilding(Building $building): self {
        if (!$this->buildings->contains($building)) {
            $this->buildings[] = $building;
            $building->setCustomer($this);
        }
        return $this;
    }
    public function removeBuilding(Building $building): self {
        if ($this->buildings->removeElement($building)) {
            if ($building->getCustomer() === $this) {
                $building->setCustomer(null);
            }
        }
        return $this;
    }
    public function __toString(): string {
        return $this->name ?? '';
    }
}