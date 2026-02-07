<?php

namespace App\Entity;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use Doctrine\DBAL\Types\Types;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use Doctrine\ORM\Mapping as ORM;
use App\State\ProspectionProvider;
use ApiPlatform\Metadata\ApiFilter;
use App\State\ProspectionProcessor;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity]
#[ApiResource(
    operations: [
        new Get(provider: ProspectionProvider::class), // Créez ce provider si vous voulez un comportement spécifique
        new GetCollection(provider: ProspectionProvider::class),
        new Post(
            processor: ProspectionProcessor::class,
            securityPostDenormalize: "is_granted('PROSPECTION_CREATE', object)"
        ),
        new Patch(security: "is_granted('PROSPECTION_EDIT', object)"),
        new Delete(security: "is_granted('PROSPECTION_DELETE', object)")
    ],
    normalizationContext: ['groups' => ['prospection:read']],
    denormalizationContext: ['groups' => ['prospection:write']]
)]
#[ApiFilter(OrderFilter::class, properties: ['date' => 'DESC'])]
#[ApiFilter(DateFilter::class, properties: ['date'])]
#[ApiFilter(SearchFilter::class, properties: ['technician' => 'exact', 'client' => 'exact'])] // Filtre par client
class Prospection
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['prospection:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?User $technician = null;

    // ✅ CHANGEMENT MAJEUR : Relation vers Customer (qui peut être un Prospect)
    #[ORM\ManyToOne(inversedBy: 'prospections')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?Customer $client = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?\DateTimeInterface $date = null;

    // --- RESTE DU FICHIER INCHANGÉ (Diagnostic, RDV, etc.) ---

    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private array $farmDetails = [];

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $concerns = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $expectations = null;

    #[ORM\Column(type: 'boolean')]
    #[Groups(['prospection:read', 'prospection:write'])]
    private bool $interventionDone = false;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $interventionComments = null;

    #[ORM\Column(type: 'boolean')]
    #[Groups(['prospection:read', 'prospection:write'])]
    private bool $appointmentTaken = false;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?\DateTimeInterface $appointmentDate = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $appointmentReason = null;

    #[ORM\Column(length: 50)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private string $status = 'NEW';

    // Getters & Setters
    public function getId(): ?int { return $this->id; }
    
    public function getClient(): ?Customer { return $this->client; }
    public function setClient(?Customer $client): self {
        $this->client = $client;
        return $this;
    }

    // ... (Autres getters/setters standards) ...
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
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
}