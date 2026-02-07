<?php

namespace App\Entity;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Patch;
use App\State\CustomerProvider;
use ApiPlatform\Metadata\Delete;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use App\Repository\CustomerRepository;
use ApiPlatform\Metadata\GetCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: CustomerRepository::class)]
#[ApiResource(
    operations: [
        new Get(provider: CustomerProvider::class),
        new Patch(),
        new GetCollection(provider: CustomerProvider::class),
        new Post(),
        new Delete()
    ],
    normalizationContext: ['groups' => ['customer:read']],
    denormalizationContext: ['groups' => ['customer:write']]
)]
#[ApiFilter(SearchFilter::class, properties: [
    'name' => 'partial',
    'zone' => 'partial',
    'code' => 'partial',
    'erpCode' => 'partial',
    'erpName' => 'partial'
])]
class Customer
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['customer:read', 'consultation:read', 'prospection:read', 'visit:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['customer:read', 'customer:write', 'consultation:read', 'prospection:read', 'visit:read'])]
    private ?string $name = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['customer:read', 'customer:write'])]
    private ?string $zone = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['customer:read', 'customer:write'])]
    private ?string $status = 'ACTIVE';

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['customer:read', 'customer:write'])]
    private ?string $code = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['customer:read', 'customer:write'])]
    private ?string $erpCode = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['customer:read', 'customer:write'])]
    private ?string $erpName = null;

    #[ORM\ManyToOne]
    #[Groups(['customer:read', 'customer:write'])]
    private ?User $createdBy = null;

    #[ORM\ManyToOne]
    #[Groups(['customer:read', 'customer:write'])]
    private ?User $affectedTo = null;

    // --- RELATIONS (OneToMany & ManyToMany) ---

    #[ORM\OneToMany(mappedBy: 'customer', targetEntity: Building::class, cascade: ['persist', 'remove'])]
    #[Groups(['customer:read', 'customer:write', 'visit:read'])]
    private Collection $buildings;

    #[ORM\ManyToMany(targetEntity: Speculation::class, inversedBy: 'customers')]
    #[Groups(['customer:read', 'customer:write'])]
    private Collection $speculations;

    #[ORM\OneToMany(mappedBy: 'customer', targetEntity: Consultation::class, cascade: ['persist', 'remove'])]
    #[Groups(['customer:detail'])]
    private Collection $consultations;

    #[ORM\OneToMany(mappedBy: 'client', targetEntity: Prospection::class, cascade: ['persist', 'remove'])]
    #[Groups(['customer:detail'])]
    private Collection $prospections;

    public function __construct()
    {
        $this->buildings = new ArrayCollection();
        $this->speculations = new ArrayCollection();
        $this->consultations = new ArrayCollection();
        $this->prospections = new ArrayCollection();
    }

    // --- GETTERS & SETTERS ---

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }
    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getZone(): ?string
    {
        return $this->zone;
    }
    public function setZone(?string $zone): self
    {
        $this->zone = $zone;
        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }
    public function setStatus(?string $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function getCode(): ?string
    {
        return $this->code;
    }
    public function setCode(?string $code): self
    {
        $this->code = $code;
        return $this;
    }

    public function getErpCode(): ?string
    {
        return $this->erpCode;
    }
    public function setErpCode(?string $erpCode): self
    {
        $this->erpCode = $erpCode;
        return $this;
    }

    public function getErpName(): ?string
    {
        return $this->erpName;
    }
    public function setErpName(?string $erpName): self
    {
        $this->erpName = $erpName;
        return $this;
    }

    public function getCreatedBy(): ?User
    {
        return $this->createdBy;
    }
    public function setCreatedBy(?User $createdBy): self
    {
        $this->createdBy = $createdBy;
        return $this;
    }

    public function getAffectedTo(): ?User
    {
        return $this->affectedTo;
    }
    public function setAffectedTo(?User $affectedTo): self
    {
        $this->affectedTo = $affectedTo;
        return $this;
    }

    // --- GESTION BUILDINGS ---

    /**
     * @return Collection<int, Building>
     */
    public function getBuildings(): Collection
    {
        return $this->buildings;
    }

    public function addBuilding(Building $building): self
    {
        if (!$this->buildings->contains($building)) {
            $this->buildings->add($building);
            $building->setCustomer($this);
        }
        return $this;
    }

    public function removeBuilding(Building $building): self
    {
        if ($this->buildings->removeElement($building)) {
            if ($building->getCustomer() === $this) {
                $building->setCustomer(null);
            }
        }
        return $this;
    }

    // --- GESTION SPECULATIONS ---

    /**
     * @return Collection<int, Speculation>
     */
    public function getSpeculations(): Collection
    {
        return $this->speculations;
    }

    public function addSpeculation(Speculation $speculation): self
    {
        if (!$this->speculations->contains($speculation)) {
            $this->speculations->add($speculation);
        }
        return $this;
    }

    public function removeSpeculation(Speculation $speculation): self
    {
        $this->speculations->removeElement($speculation);
        return $this;
    }

    // --- GESTION CONSULTATIONS ---

    /**
     * @return Collection<int, Consultation>
     */
    public function getConsultations(): Collection
    {
        return $this->consultations;
    }

    public function addConsultation(Consultation $consultation): self
    {
        if (!$this->consultations->contains($consultation)) {
            $this->consultations->add($consultation);
            $consultation->setCustomer($this);
        }
        return $this;
    }

    public function removeConsultation(Consultation $consultation): self
    {
        if ($this->consultations->removeElement($consultation)) {
            if ($consultation->getCustomer() === $this) {
                $consultation->setCustomer(null);
            }
        }
        return $this;
    }

    // --- GESTION PROSPECTIONS ---

    /**
     * @return Collection<int, Prospection>
     */
    public function getProspections(): Collection
    {
        return $this->prospections;
    }

    public function addProspection(Prospection $prospection): self
    {
        if (!$this->prospections->contains($prospection)) {
            $this->prospections->add($prospection);
            $prospection->setClient($this);
        }
        return $this;
    }

    public function removeProspection(Prospection $prospection): self
    {
        if ($this->prospections->removeElement($prospection)) {
            if ($prospection->getClient() === $this) {
                $prospection->setClient(null);
            }
        }
        return $this;
    }
}
