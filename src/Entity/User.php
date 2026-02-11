<?php

namespace App\Entity;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Put;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use Doctrine\ORM\Mapping as ORM;
use App\Repository\UserRepository;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use App\State\UserPasswordHasher;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[UniqueEntity(fields: ['username'], message: 'Ce nom d\'utilisateur est déjà utilisé.')]
#[ApiResource(
    operations: [
        new Get(),
        new GetCollection(),
        new Post(processor: UserPasswordHasher::class, security: "is_granted('ROLE_ADMIN')"),
        new Patch(processor: UserPasswordHasher::class, security: "is_granted('ROLE_ADMIN')"),
        new Delete(security: "is_granted('ROLE_ADMIN')")
    ],
    normalizationContext: ['groups' => ['user:detail','user:read']],
    denormalizationContext: ['groups' => ['user:write']]
)]
#[ApiFilter(SearchFilter::class, properties: ['username' => 'partial', 'fullname' => 'partial', 'email' => 'partial', 'code' => 'partial', 'workZone' => 'partial'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['user:read', 'customer:read', 'visit:read', 'prospection:read','consultation:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    #[Groups(['user:read', 'user:write','prospection:read','visit:read','consultation:read'])]
    #[Assert\NotBlank]
    private ?string $username = null;

    #[ORM\Column]
    #[Groups(['user:read', 'user:write'])]
    private array $roles = [];

    /**
     * @var string The hashed password
     */
    #[ORM\Column]
    private ?string $password = null;

    #[Groups(['user:write'])]
    #[SerializedName('password')]
    private ?string $plainPassword = null;

    #[ORM\Column(length: 255)]
    #[Groups(['user:read', 'user:write', 'customer:read', 'visit:read', 'prospection:read', 'consultation:read'])]
    private ?string $fullname = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['user:read', 'user:write'])]
    private ?string $code = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['user:read', 'user:write'])]
    private ?string $workZone = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['user:read', 'user:write'])]
    private ?string $phoneNumber = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['user:read', 'user:write'])]
    private ?string $email = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['user:read', 'user:write'])]
    private ?string $type = null;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['user:read', 'user:write'])]
    private ?bool $activated = true;

    // --- RELATIONS INVERSES ---

    #[ORM\OneToMany(mappedBy: 'technician', targetEntity: Visit::class)]
    #[Groups(['user:detail'])] // Pas dans user:read pour éviter la boucle infinie
    private Collection $visits;

    #[ORM\OneToMany(mappedBy: 'technician', targetEntity: Prospection::class)]
    #[Groups(['user:detail'])]
    private Collection $prospections;

    #[ORM\OneToMany(mappedBy: 'technician', targetEntity: Consultation::class)]
    #[Groups(['user:detail'])]
    private Collection $consultations;

    #[ORM\OneToMany(mappedBy: 'createdBy', targetEntity: Customer::class)]
    #[Groups(['user:detail'])]
    private Collection $createdCustomers;

    #[ORM\OneToMany(mappedBy: 'affectedTo', targetEntity: Customer::class)]
    #[Groups(['user:detail'])]
    private Collection $assignedCustomers;

    #[ORM\OneToMany(mappedBy: 'user', targetEntity: UserObjective::class, cascade: ['persist', 'remove'])]
    private Collection $objectives;

    public function __construct()
    {
        $this->visits = new ArrayCollection();
        $this->prospections = new ArrayCollection();
        $this->consultations = new ArrayCollection();
        $this->createdCustomers = new ArrayCollection();
        $this->assignedCustomers = new ArrayCollection();
        $this->objectives = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }

    public function getUsername(): ?string { return $this->username; }
    public function setUsername(string $username): self { $this->username = $username; return $this; }

    public function getUserIdentifier(): string { return (string) $this->username; }

    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';
        return array_unique($roles);
    }
    public function setRoles(array $roles): self { $this->roles = $roles; return $this; }

    public function getPassword(): string { return $this->password; }
    public function setPassword(string $password): self { $this->password = $password; return $this; }

    public function getPlainPassword(): ?string { return $this->plainPassword; }
    public function setPlainPassword(?string $plainPassword): self { $this->plainPassword = $plainPassword; return $this; }

    public function eraseCredentials(): void { $this->plainPassword = null; }

    public function getFullname(): ?string { return $this->fullname; }
    public function setFullname(string $fullname): self { $this->fullname = $fullname; return $this; }

    public function getCode(): ?string { return $this->code; }
    public function setCode(?string $code): self { $this->code = $code; return $this; }

    public function getWorkZone(): ?string { return $this->workZone; }
    public function setWorkZone(?string $workZone): self { $this->workZone = $workZone; return $this; }

    public function getPhoneNumber(): ?string { return $this->phoneNumber; }
    public function setPhoneNumber(?string $phoneNumber): self { $this->phoneNumber = $phoneNumber; return $this; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): self { $this->email = $email; return $this; }

    public function getType(): ?string { return $this->type; }
    public function setType(?string $type): self { $this->type = $type; return $this; }

    public function isActivated(): ?bool { return $this->activated; }
    public function setActivated(bool $activated): self { $this->activated = $activated; return $this; }


    // --- GETTERS & SETTERS POUR LES RELATIONS ---

    /**
     * @return Collection<int, Visit>
     */
    public function getVisits(): Collection
    {
        return $this->visits;
    }

    public function addVisit(Visit $visit): self
    {
        if (!$this->visits->contains($visit)) {
            $this->visits->add($visit);
            $visit->setTechnician($this);
        }
        return $this;
    }

    public function removeVisit(Visit $visit): self
    {
        if ($this->visits->removeElement($visit)) {
            if ($visit->getTechnician() === $this) {
                $visit->setTechnician(null);
            }
        }
        return $this;
    }

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
            $prospection->setTechnician($this);
        }
        return $this;
    }

    public function removeProspection(Prospection $prospection): self
    {
        if ($this->prospections->removeElement($prospection)) {
            if ($prospection->getTechnician() === $this) {
                $prospection->setTechnician(null);
            }
        }
        return $this;
    }

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
            $consultation->setTechnician($this);
        }
        return $this;
    }

    public function removeConsultation(Consultation $consultation): self
    {
        if ($this->consultations->removeElement($consultation)) {
            if ($consultation->getTechnician() === $this) {
                $consultation->setTechnician(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, Customer>
     */
    public function getCreatedCustomers(): Collection
    {
        return $this->createdCustomers;
    }

    public function addCreatedCustomer(Customer $customer): self
    {
        if (!$this->createdCustomers->contains($customer)) {
            $this->createdCustomers->add($customer);
            $customer->setCreatedBy($this);
        }
        return $this;
    }

    public function removeCreatedCustomer(Customer $customer): self
    {
        if ($this->createdCustomers->removeElement($customer)) {
            if ($customer->getCreatedBy() === $this) {
                $customer->setCreatedBy(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, Customer>
     */
    public function getAssignedCustomers(): Collection
    {
        return $this->assignedCustomers;
    }

    public function addAssignedCustomer(Customer $customer): self
    {
        if (!$this->assignedCustomers->contains($customer)) {
            $this->assignedCustomers->add($customer);
            $customer->setAffectedTo($this);
        }
        return $this;
    }

    public function removeAssignedCustomer(Customer $customer): self
    {
        if ($this->assignedCustomers->removeElement($customer)) {
            if ($customer->getAffectedTo() === $this) {
                $customer->setAffectedTo(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, UserObjective>
     */
    public function getObjectives(): Collection
    {
        return $this->objectives;
    }

    public function addObjective(UserObjective $objective): self
    {
        if (!$this->objectives->contains($objective)) {
            $this->objectives->add($objective);
            $objective->setUser($this);
        }
        return $this;
    }

    public function removeObjective (UserObjective $objective): self
    {
        if ($this->objectives->removeElement($objective)) {
            if ($objective->getUser() === $this) {
                $objective->setUser(null);
            }
        }
        return $this;
    }

    /**
     * Getter virtuel pour exposer l'objectif actuel via l'API
     */
    #[Groups(['user:read', 'visit:read'])] 
    public function getDailyVisitObjective(): int
    {
        // On récupère le dernier objectif valide (le plus récent)
        // Ou celui actif aujourd'hui
        $today = new \DateTime();
        
        foreach ($this->objectives as $obj) {
            $start = $obj->getStartDate();
            $end = $obj->getEndDate();
            
            // Si la date du jour est dans la plage de validité
            if ($today >= $start && ($end === null || $today <= $end)) {
                return $obj->getDailyRate();
            }
        }

        return 0; // Valeur par défaut si aucun objectif actif
    }
}