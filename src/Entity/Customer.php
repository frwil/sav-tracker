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
#[ApiResource(
    normalizationContext: ['groups' => ['customer:read']],
    denormalizationContext: ['groups' => ['customer:write']] // 👈 AJOUTÉ : Permet l'écriture
)]
class Customer
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['customer:read', 'visit:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['customer:read', 'customer:write', 'visit:read'])] // 👈 customer:write ajouté partout
    private ?string $name = null;

    #[ORM\Column(length: 255)]
    #[Groups(['customer:read', 'customer:write', 'visit:read'])]
    private ?string $zone = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['customer:read', 'customer:write'])]
    private ?string $exactLocation = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['customer:read', 'customer:write'])]
    private ?string $code = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['customer:read', 'customer:write'])]
    private ?string $erpCode = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['customer:read', 'customer:write'])]
    private ?string $erpName = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['customer:read', 'customer:write', 'visit:read'])]
    private ?string $phoneNumber = null;

    #[ORM\OneToMany(mappedBy: 'customer', targetEntity: Building::class, orphanRemoval: true)]
    private Collection $buildings;

    #[ORM\ManyToMany(targetEntity: Speculation::class)]
    #[Groups(['customer:read', 'customer:write'])]
    private Collection $speculations;

    // 👇 NOUVEL ATTRIBUT POUR L'ARCHIVAGE
    #[ORM\Column(options: ['default' => true])]
    #[Groups(['customer:read', 'customer:write', 'visit:read'])]
    private ?bool $activated = true;

    public function __construct()
    {
        $this->buildings = new ArrayCollection();
        $this->speculations = new ArrayCollection();
    }

    // Getters/Setters...
    public function getId(): ?int { return $this->id; }
    
    public function getName(): ?string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }

    public function getZone(): ?string { return $this->zone; }
    public function setZone(string $zone): self { $this->zone = $zone; return $this; }

    public function getExactLocation(): ?string { return $this->exactLocation; }
    public function setExactLocation(?string $exactLocation): self { $this->exactLocation = $exactLocation; return $this; }

    public function getCode(): ?string { return $this->code; }
    public function setCode(?string $code): self { $this->code = $code; return $this; }

    public function getErpCode(): ?string { return $this->erpCode; }
    public function setErpCode(?string $erpCode): self { $this->erpCode = $erpCode; return $this; }

    public function getErpName(): ?string { return $this->erpName; }
    public function setErpName(?string $erpName): self { $this->erpName = $erpName; return $this; }

    public function getPhoneNumber(): ?string { return $this->phoneNumber; }
    public function setPhoneNumber(?string $phoneNumber): self { $this->phoneNumber = $phoneNumber; return $this; }

    public function isActivated(): ?bool { return $this->activated; }
    public function setActivated(bool $activated): self { $this->activated = $activated; return $this; }

    // ... (Reste des méthodes pour buildings et speculations inchangées)
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
    // ...
}