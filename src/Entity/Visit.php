<?php

namespace App\Entity;

use App\Entity\Observation;
use App\State\VisitProvider;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use Doctrine\DBAL\Types\Types;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiFilter;
use App\Repository\VisitRepository;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\OpenApi\Model\Schema;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\OpenApi\Model\MediaType;
use ApiPlatform\OpenApi\Model\Operation;
use App\Controller\CloseVisitController;
use ApiPlatform\OpenApi\Model\RequestBody;
use App\Validator\Constraints as AppAssert;
use Doctrine\Common\Collections\Collection;
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use Doctrine\Common\Collections\ArrayCollection;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;


#[ORM\Entity(repositoryClass: VisitRepository::class)]
#[AppAssert\SequentialVisitDate]
#[ApiResource(
    operations: [
        new Get(provider: VisitProvider::class), // Créez ce provider si vous voulez un comportement spécifique
        new GetCollection(provider: VisitProvider::class),
        new Post(),
        new Patch(),
        new Delete(),
        // 👇 AJOUTEZ CETTE OPÉRATION PERSONNALISÉE
        new Patch(
            uriTemplate: '/visits/{id}/close', 
            controller: CloseVisitController::class, 
            openapi: new Operation(
                summary : 'Clôturer la visite',
                description : 'Marque la visite comme terminée et verrouille les modifications.',
                requestBody: new RequestBody(
                    content: new \ArrayObject([
                        'application/json' => new MediaType(
                            schema: new Schema()
                        )
                    ])
                )
            ),
            denormalizationContext: ['groups' => ['visit:close']], // Groupe vide pour éviter de demander des champs
            input: false, // Pas de corps JSON requis
            name: 'close_visit'
        )
    ],
    normalizationContext: ['groups' => ['visit:read']],
    denormalizationContext: ['groups' => ['visit:write']]
)]
#[ApiFilter(SearchFilter::class, properties: ['customer' => 'exact', 'technician' => 'exact'])]
#[ApiFilter(BooleanFilter::class, properties: ['closed', 'activated'])]
#[ApiFilter(DateFilter::class, properties: ['visitedAt'])]
#[ApiFilter(OrderFilter::class, properties: ['visitedAt' => 'DESC'])]
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
    #[Groups(['visit:read', 'visit:write'])]
    private ?Customer $customer = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    #[Groups(['visit:read', 'visit:write'])]
    private ?\DateTimeInterface $visitedAt = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['visit:read', 'visit:write'])]
    private ?string $gpsCoordinates = null;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['visit:read', 'visit:write'])] 
    private ?bool $closed = false;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['visit:read'])] 
    private ?bool $activated = true;

    #[ORM\OneToMany(mappedBy: 'visit', targetEntity: Observation::class, orphanRemoval: true)]
    #[Groups(['visit:read', 'visit:write'])]
    private Collection $observations;

    #[ORM\Column(type: Types::TEXT)]
    #[Groups(['visit:read', 'visit:write'])]
    #[Assert\NotBlank(message: "L'objectif principal de la visite est obligatoire.")]
    private ?string $objective = 'RAS';

    /**
     * Date de réalisation effective (KPI : Adhérence)
     */
    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['visit:read', 'visit:write'])]
    private ?\DateTimeInterface $completedAt = null;

    /**
     * Date de planification (Agenda). 
     * Si null, c'est une visite spontanée.
     */
    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['visit:read', 'visit:write'])]
    private ?\DateTimeInterface $plannedAt = null;

    public function __construct()
    {
        $this->observations = new ArrayCollection();
        $this->visitedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getTechnician(): ?User { return $this->technician; }
    public function setTechnician(?User $technician): self { $this->technician = $technician; return $this; }

    public function getCustomer(): ?Customer { return $this->customer; }
    public function setCustomer(?Customer $customer): self { $this->customer = $customer; return $this; }

    public function getVisitedAt(): ?\DateTimeInterface { return $this->visitedAt; }
    public function setVisitedAt(\DateTimeInterface $visitedAt): self { $this->visitedAt = $visitedAt; return $this; }

    public function getGpsCoordinates(): ?string { return $this->gpsCoordinates; }
    public function setGpsCoordinates(?string $gpsCoordinates): self { $this->gpsCoordinates = $gpsCoordinates; return $this; }

    public function isClosed(): ?bool { return $this->closed; }
    public function setClosed(bool $closed): self
    {
        $this->closed = $closed;

        // Si on ferme la visite et qu'aucune date de fin n'est définie, on met "Maintenant"
        if ($closed === true && $this->completedAt === null) {
            $this->completedAt = new \DateTime();
        }

        return $this;
    }
    public function isActivated(): ?bool { return $this->activated; }
    public function setActivated(bool $activated): self { $this->activated = $activated; return $this; }

    /**
     * @return Collection<int, Observation>
     */
    public function getObservations(): Collection { return $this->observations; }

    public function addObservation(Observation $observation): self
    {
        if (!$this->observations->contains($observation)) {
            $this->observations->add($observation);
            $observation->setVisit($this);
        }
        return $this;
    }

    public function removeObservation(Observation $observation): self
    {
        if ($this->observations->removeElement($observation)) {
            if ($observation->getVisit() === $this) {
                $observation->setVisit(null);
            }
        }
        return $this;
    }

    public function getObjective(): ?string { return $this->objective; }
    public function setObjective(string $objective): self { $this->objective = $objective; return $this; }

    public function getCompletedAt(): ?\DateTimeInterface
    {
        return $this->completedAt;
    }

    public function setCompletedAt(?\DateTimeInterface $completedAt): self
    {
        $this->completedAt = $completedAt;
        return $this;
    }

    /**
     * KPI : Écart en heures (Négatif = Avance, Positif = Retard)
     */
    #[Groups(['visit:read'])]
    public function getTimeDeviation(): ?int
    {
        if (!$this->visitedAt || !$this->completedAt) return null;
        
        // Comparaison simple des timestamps
        $seconds = $this->completedAt->getTimestamp() - $this->visitedAt->getTimestamp();
        return (int) round($seconds / 3600);
    }

    public function getPlannedAt(): ?\DateTimeInterface
    {
        return $this->plannedAt;
    }

    public function setPlannedAt(?\DateTimeInterface $plannedAt): self
    {
        $this->plannedAt = $plannedAt;
        return $this;
    }

    #[Groups(['visit:read'])]
    public function isPlanned(): bool
    {
        return $this->plannedAt !== null;
    }

    /**
     * KPI : Écart de planning (en jours)
     * 0 = Le jour même, < 0 = En avance, > 0 = En retard, Null = Spontané ou pas fait
     */
    #[Groups(['visit:read'])]
    public function getPlanningDeviation(): ?int
    {
        if ($this->plannedAt === null || $this->visitedAt === null) {
            return null;
        }

        // On compare les dates sans les heures pour l'adhérence jour
        $plan = \DateTime::createFromInterface($this->plannedAt)->setTime(0, 0);
        $real = \DateTime::createFromInterface($this->visitedAt)->setTime(0, 0);
        
        $diff = $real->diff($plan);
        
        // $diff->invert est 1 si $real > $plan (donc retard)
        return $diff->days * ($diff->invert ? 1 : -1); 
    }
}