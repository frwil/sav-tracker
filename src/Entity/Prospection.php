<?php

namespace App\Entity;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use Doctrine\DBAL\Types\Types;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use Doctrine\ORM\Mapping as ORM;
use App\State\ProspectionProcessor;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Attribute\Groups;
use ApiPlatform\Metadata\ApiFilter; // <--- AJOUTER
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter; // <--- AJOUTER

#[ORM\Entity]
#[ApiResource(
    operations: [
        new Get(
            security: "is_granted('PROSPECTION_VIEW', object)"
        ),
        new GetCollection(), // Le filtrage se fera via une Extension Doctrine
        new Post(
            processor: ProspectionProcessor::class, // ✅ Injection automatique du technicien
            security: "is_granted('ROLE_TECHNICIAN')"
        ),
        new Patch(
            security: "is_granted('PROSPECTION_EDIT', object)"
        ),
        new Delete( // ✅ Opération de suppression ajoutée
            security: "is_granted('PROSPECTION_DELETE', object)"
        )
    ],
    normalizationContext: ['groups' => ['prospection:read']],
    denormalizationContext: ['groups' => ['prospection:write']]
)]
#[ApiFilter(OrderFilter::class, properties: ['date' => 'DESC'])]
#[ApiFilter(SearchFilter::class, properties: [
    'technician' => 'exact',
    'prospectName' => 'partial' // ✅ 2. Recherche partielle par nom
])]
#[ApiFilter(DateFilter::class, properties: ['date'])] // ✅ 3. Filtre par date
#[ApiFilter(SearchFilter::class, properties: ['technician' => 'exact'])]
class Prospection
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['prospection:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?User $technician = null; // Celui qui fait la prospection

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?\DateTimeInterface $date = null;

    // --- INFOS PROSPECT ---

    #[ORM\Column(length: 255)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $prospectName = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $phoneNumber = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $locationLabel = null; // Ex: "Douala, Akwa"

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $gpsCoordinates = null; // Ex: "4.051, 9.708"

    // --- INFOS FERME (JSON) ---
    /* Structure attendue :
       [
         { "speculation": "Poulet Chair", "batiments": 2, "effectif": 5000 },
         { "speculation": "Porc", "batiments": 1, "effectif": 50 }
       ]
    */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private array $farmDetails = [];

    // --- BESOINS ---

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $concerns = null; // Préoccupations

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $expectations = null; // Attentes

    // --- INTERVENTION ---

    #[ORM\Column(type: 'boolean')]
    #[Groups(['prospection:read', 'prospection:write'])]
    private bool $interventionDone = false;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $interventionComments = null;

    // --- RENDEZ-VOUS ---

    #[ORM\Column(type: 'boolean')]
    #[Groups(['prospection:read', 'prospection:write'])]
    private bool $appointmentTaken = false;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?\DateTimeInterface $appointmentDate = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private ?string $appointmentType = null; // 'VISIT' ou 'CONSULTATION'

    #[ORM\Column(length: 50)]
    #[Groups(['prospection:read', 'prospection:write'])]
    private string $status = 'NEW'; // NEW, CONVERTED, LOST

    // Getters et Setters...

    public function getId(): ?int { return $this->id; }
    public function getTechnician(): ?User { return $this->technician; }
    public function setTechnician(?User $technician): self {
        $this->technician = $technician;
        return $this;
    }
    public function getDate(): ?\DateTimeInterface { return $this->date; }
    public function setDate(\DateTimeInterface $date): self {
        $this->date = $date;
        return $this;
    }
    public function getProspectName(): ?string { return $this->prospectName; }
    public function setProspectName(string $prospectName): self {
        $this->prospectName = $prospectName;
        return $this;
    }
    public function getPhoneNumber(): ?string { return $this->phoneNumber; }
    public function setPhoneNumber(?string $phoneNumber): self {
        $this->phoneNumber = $phoneNumber;
        return $this;
    }
    public function getLocationLabel(): ?string { return $this->locationLabel; }
    public function setLocationLabel(?string $locationLabel): self {
        $this->locationLabel = $locationLabel;
        return $this;
    }
    public function getGpsCoordinates(): ?string { return $this->gpsCoordinates; }
    public function setGpsCoordinates(?string $gpsCoordinates): self {
        $this->gpsCoordinates = $gpsCoordinates;
        return $this;
    }
    public function getFarmDetails(): array { return $this->farmDetails; }
    public function setFarmDetails(array $farmDetails): self {
        $this->farmDetails = $farmDetails;
        return $this;
    }
    public function getConcerns(): ?string { return $this->concerns; }
    public function setConcerns(?string $concerns): self {  
        $this->concerns = $concerns;
        return $this;
    }
    public function getExpectations(): ?string { return $this->expectations; }
    public function setExpectations(?string $expectations): self {
        $this->expectations = $expectations;
        return $this;
    }
    public function isInterventionDone(): bool { return $this->interventionDone; }
    public function setInterventionDone(bool $interventionDone): self {
        $this->interventionDone = $interventionDone;
        return $this;
    }
    public function getInterventionComments(): ?string { return $this->interventionComments; }
    public function setInterventionComments(?string $interventionComments): self {
        $this->interventionComments = $interventionComments;
        return $this;
    }
    public function isAppointmentTaken(): bool { return $this->appointmentTaken; }
    public function setAppointmentTaken(bool $appointmentTaken): self {
        $this->appointmentTaken = $appointmentTaken;
        return $this;
    }
    public function getAppointmentDate(): ?\DateTimeInterface { return $this->appointmentDate; }
    public function setAppointmentDate(?\DateTimeInterface $appointmentDate): self {
        $this->appointmentDate = $appointmentDate;
        return $this;
    }
    public function getAppointmentType(): ?string { return $this->appointmentType; }
    public function setAppointmentType(?string $appointmentType): self {
        $this->appointmentType = $appointmentType;
        return $this;
    }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self {
        $this->status = $status;
        return $this;
    }
}