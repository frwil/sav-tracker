<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;
use Symfony\Component\Serializer\Attribute\Groups;
use App\State\ConsultationProcessor; // Pensez à créer ce processeur (copie de ProspectionProcessor)
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;

#[ORM\Entity]
#[ApiResource(
    operations: [
        new Get(security: "is_granted('CONSULTATION_VIEW', object)"),
        new GetCollection(),
        new Post(
            processor: ConsultationProcessor::class,
            securityPostDenormalize: "is_granted('CONSULTATION_CREATE', object)"
        ),
        new Patch(security: "is_granted('CONSULTATION_EDIT', object)"),
        new Delete(security: "is_granted('CONSULTATION_DELETE', object)")
    ],
    normalizationContext: ['groups' => ['consultation:read']],
    denormalizationContext: ['groups' => ['consultation:write']]
)]
#[ApiFilter(OrderFilter::class, properties: ['date' => 'DESC'])]
#[ApiFilter(DateFilter::class, properties: ['date'])]
#[ApiFilter(SearchFilter::class, properties: ['technician' => 'exact', 'customer' => 'exact'])]
class Consultation
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['consultation:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[Groups(['consultation:read', 'consultation:write'])]
    private ?User $technician = null;

    #[ORM\ManyToOne(inversedBy: 'consultations')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['consultation:read', 'consultation:write'])]
    private ?Customer $customer = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    #[Groups(['consultation:read', 'consultation:write'])]
    private ?\DateTimeInterface $date = null;

    // --- MÊMES CHAMPS MÉTIER QUE PROSPECTION ---

    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['consultation:read', 'consultation:write'])]
    private array $farmDetails = [];

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['consultation:read', 'consultation:write'])]
    private ?string $concerns = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['consultation:read', 'consultation:write'])]
    private ?string $expectations = null;

    #[ORM\Column(type: 'boolean')]
    #[Groups(['consultation:read', 'consultation:write'])]
    private bool $interventionDone = false;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['consultation:read', 'consultation:write'])]
    private ?string $interventionComments = null;

    #[ORM\Column(type: 'boolean')]
    #[Groups(['consultation:read', 'consultation:write'])]
    private bool $appointmentTaken = false;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['consultation:read', 'consultation:write'])]
    private ?\DateTimeInterface $appointmentDate = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['consultation:read', 'consultation:write'])]
    private ?string $appointmentReason = null;

    // --- GETTERS / SETTERS (Simplifiés pour l'exemple) ---
    public function getId(): ?int { return $this->id; }
    public function getCustomer(): ?Customer { return $this->customer; }
    public function setCustomer(?Customer $customer): self { $this->customer = $customer; return $this; }
    
    // ... Ajoutez ici les autres getters/setters identiques à Prospection ...
    public function getTechnician(): ?User { return $this->technician; }
    public function setTechnician(?User $technician): self { $this->technician = $technician; return $this; }
    public function getDate(): ?\DateTimeInterface { return $this->date; }
    public function setDate(\DateTimeInterface $date): self { $this->date = $date; return $this; }
    public function getFarmDetails(): array { return $this->farmDetails; }
    public function setFarmDetails(array $farmDetails): self { $this->farmDetails = $farmDetails; return $this; }
    public function getConcerns(): ?string { return $this->concerns; }
    public function setConcerns(?string $concerns): self { $this->concerns = $concerns; return $this; }
    public function getExpectations(): ?string { return $this->expectations; }
    public function setExpectations(?string $expectations): self { $this->expectations = $expectations; return $this; }
    public function isInterventionDone(): bool { return $this->interventionDone; }
    public function setInterventionDone(bool $interventionDone): self { $this->interventionDone = $interventionDone; return $this; }
    public function getInterventionComments(): ?string { return $this->interventionComments; }
    public function setInterventionComments(?string $interventionComments): self { $this->interventionComments = $interventionComments; return $this; }
    public function isAppointmentTaken(): bool { return $this->appointmentTaken; }
    public function setAppointmentTaken(bool $appointmentTaken): self { $this->appointmentTaken = $appointmentTaken; return $this; }
    public function getAppointmentDate(): ?\DateTimeInterface { return $this->appointmentDate; }
    public function setAppointmentDate(?\DateTimeInterface $appointmentDate): self { $this->appointmentDate = $appointmentDate; return $this; }
    public function getAppointmentReason(): ?string { return $this->appointmentReason; }
    public function setAppointmentReason(?string $appointmentReason): self { $this->appointmentReason = $appointmentReason; return $this; }
}