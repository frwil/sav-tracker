<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use ApiPlatform\OpenApi\Model\MediaType;
use ApiPlatform\OpenApi\Model\Operation as OpenApiOperation;
use ApiPlatform\OpenApi\Model\RequestBody;
use ApiPlatform\OpenApi\Model\Schema;
use App\Controller\CloseVisitController;
use App\Controller\StartVisitController;
use App\Repository\VisitRepository;
use App\State\VisitProvider;
use App\Validator\Constraints as AppAssert;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: VisitRepository::class)]
#[AppAssert\SequentialVisitDate]
#[ApiResource(
    operations: [
        new Get(
            provider: VisitProvider::class,
            normalizationContext: ['groups' => ['visit:read', 'visit:detail']]
        ),
        new GetCollection(
            provider: VisitProvider::class,
            normalizationContext: ['groups' => ['visit:read', 'visit:list']]
        ),
        new Post(),
        new Patch(),
        new Delete(),
        new Patch(
            uriTemplate: '/visits/{id}/close',
            controller: CloseVisitController::class,
            openapi: new OpenApiOperation(
                summary: 'Clôturer la visite',
                description: 'Marque la visite comme terminée.',
                requestBody: new RequestBody(
                    content: new \ArrayObject([
                        'application/json' => new MediaType(schema: new Schema())
                    ])
                )
            ),
            denormalizationContext: ['groups' => ['visit:close']],
            input: false,
            name: 'close_visit'
        ),
        new Patch(
            uriTemplate: '/visits/{id}/start',
            controller: StartVisitController::class,
            openapi: new OpenApiOperation(
                summary: 'Démarrer la visite',
                description: 'Marque le début effectif.',
            ),
            denormalizationContext: ['groups' => ['visit:start']],
            input: false,
            name: 'start_visit'
        )
    ],
    normalizationContext: ['groups' => ['visit:read']],
    denormalizationContext: ['groups' => ['visit:write']]
)]
class Visit
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['visit:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['visit:read', 'visit:write'])]
    private ?User $technician = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['visit:read', 'visit:write', 'visit:list'])]
    private ?Customer $customer = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['visit:read', 'visit:write', 'visit:list'])]
    private ?\DateTimeInterface $visitedAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['visit:read', 'visit:write', 'visit:list'])]
    private ?\DateTimeInterface $plannedAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['visit:read', 'visit:write', 'visit:list'])]
    private ?\DateTimeInterface $completedAt = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['visit:read', 'visit:write', 'visit:list'])]
    private ?string $gpsCoordinates = null;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['visit:read', 'visit:write', 'visit:list'])]
    private bool $closed = false;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['visit:read', 'visit:list'])]
    private bool $activated = true;

    #[ORM\OneToMany(mappedBy: 'visit', targetEntity: Observation::class, orphanRemoval: true)]
    #[Groups(['visit:detail'])]
    private Collection $observations;

    #[ORM\OneToMany(mappedBy: 'visit', targetEntity: ObservationPhoto::class, orphanRemoval: true)]
    #[Groups(['visit:detail'])]
    private Collection $photos;

    #[ORM\Column(type: Types::TEXT)]
    #[Groups(['visit:read', 'visit:write', 'visit:list'])]
    #[Assert\NotBlank(message: "L'objectif est obligatoire.")]
    private string $objective = 'RAS';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['visit:read', 'visit:write', 'visit:detail'])]
    private ?string $conclusion = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['visit:read', 'visit:write', 'visit:detail'])]
    private ?array $metadata = null;

    public function __construct()
    {
        $this->observations = new ArrayCollection();
        $this->photos = new ArrayCollection();
    }

    // --- Getters & Setters ---

    public function getId(): ?int { return $this->id; }

    public function getTechnician(): ?User { return $this->technician; }
    public function setTechnician(?User $technician): self { $this->technician = $technician; return $this; }

    public function getCustomer(): ?Customer { return $this->customer; }
    public function setCustomer(?Customer $customer): self { $this->customer = $customer; return $this; }

    public function getVisitedAt(): ?\DateTimeInterface { return $this->visitedAt; }
    public function setVisitedAt(?\DateTimeInterface $visitedAt): self { $this->visitedAt = $visitedAt; return $this; }

    public function getPlannedAt(): ?\DateTimeInterface { return $this->plannedAt; }
    public function setPlannedAt(?\DateTimeInterface $plannedAt): self { $this->plannedAt = $plannedAt; return $this; }

    public function getCompletedAt(): ?\DateTimeInterface { return $this->completedAt; }
    public function setCompletedAt(?\DateTimeInterface $completedAt): self { $this->completedAt = $completedAt; return $this; }

    public function getGpsCoordinates(): ?string { return $this->gpsCoordinates; }
    public function setGpsCoordinates(?string $gpsCoordinates): self { $this->gpsCoordinates = $gpsCoordinates; return $this; }

    public function isClosed(): bool { return $this->closed; }
    public function setClosed(bool $closed): self { 
        $this->closed = $closed; 
        if ($closed && !$this->completedAt) {
            $this->completedAt = new \DateTime();
        }
        return $this; 
    }

    public function isActivated(): bool { return $this->activated; }
    public function setActivated(bool $activated): self { $this->activated = $activated; return $this; }
    
    public function getObservations(): Collection { return $this->observations; }
    public function addObservation(Observation $observation): self {
        if (!$this->observations->contains($observation)) {
            $this->observations->add($observation);
            $observation->setVisit($this);
        }
        return $this;
    }

    public function getPhotos(): Collection { return $this->photos; }
    public function addPhoto(ObservationPhoto $photo): self {
        if (!$this->photos->contains($photo)) {
            $this->photos->add($photo);
            $photo->setVisit($this);
        }
        return $this;
    }

    public function getObjective(): string { return $this->objective; }
    public function setObjective(string $objective): self { $this->objective = $objective; return $this; }

    public function getConclusion(): ?string { return $this->conclusion; }
    public function setConclusion(?string $conclusion): self { $this->conclusion = $conclusion; return $this; }

    public function getMetadata(): ?array { return $this->metadata; }
    public function setMetadata(?array $metadata): self { $this->metadata = $metadata; return $this; }

    // --- Virtual Properties (Calculated) ---

    #[Groups(['visit:read', 'visit:list'])]
    public function getStatus(): string
    {
        if (!$this->activated) return 'archived';
        if ($this->closed || $this->completedAt) return 'completed';
        if ($this->visitedAt) return 'in_progress';
        if ($this->plannedAt) return 'planned';
        return 'draft';
    }

    #[Groups(['visit:read', 'visit:list'])]
    public function getPlanningDeviation(): ?int
    {
        if (!$this->plannedAt || !$this->visitedAt) return null;
        $plan = \DateTime::createFromInterface($this->plannedAt)->setTime(0, 0, 0);
        $real = \DateTime::createFromInterface($this->visitedAt)->setTime(0, 0, 0);
        $diff = $real->diff($plan);
        return $diff->days * ($diff->invert ? 1 : -1);
    }

    #[Groups(['visit:read', 'visit:list'])]
    public function getDuration(): ?int
    {
        if (!$this->visitedAt || !$this->completedAt) return null;
        return (int)(($this->completedAt->getTimestamp() - $this->visitedAt->getTimestamp()) / 60);
    }
}