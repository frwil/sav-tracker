<?php

namespace App\Entity;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(security: "is_granted('ROLE_SALES_REP') or is_granted('ROLE_ADMIN') or is_granted('ROLE_SUPER_ADMIN')"),
        new GetCollection(security: "is_granted('ROLE_SALES_REP') or is_granted('ROLE_ADMIN') or is_granted('ROLE_SUPER_ADMIN')"),
        new Post(security: "is_granted('ROLE_SALES_REP')"),
        new Patch(security: "is_granted('ROLE_SALES_REP')"),
        new Delete(security: "is_granted('ROLE_SALES_REP')")
    ],
    normalizationContext: ['groups' => ['quality_audit:read']],
    denormalizationContext: ['groups' => ['quality_audit:write']]
)]
#[ApiFilter(SearchFilter::class, properties: ['visit' => 'exact'])]
class QualityAudit
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['quality_audit:read', 'sales_visit:read'])]
    private ?int $id = null;

    #[ORM\OneToOne(inversedBy: 'qualityAudit')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['quality_audit:read', 'quality_audit:write'])]
    private ?SalesVisit $visit = null;

    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?int $damagedBagsCount = null;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?float $damagedBagsRate = null; // % estimé

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?bool $storageOnPallets = true;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?bool $storageDryArea = true;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?bool $storageProtected = true;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?bool $pestPresence = false;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?bool $moldPresence = false;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?bool $odorIssue = false;

    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?int $cleanlinessScore = null; // 1 à 5

    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?int $overallQualityScore = null; // 1 à 5

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['quality_audit:read', 'quality_audit:write', 'sales_visit:read'])]
    private ?string $comment = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['quality_audit:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getVisit(): ?SalesVisit { return $this->visit; }
    public function setVisit(?SalesVisit $visit): self { $this->visit = $visit; return $this; }

    public function getDamagedBagsCount(): ?int { return $this->damagedBagsCount; }
    public function setDamagedBagsCount(?int $count): self { $this->damagedBagsCount = $count; return $this; }

    public function getDamagedBagsRate(): ?float { return $this->damagedBagsRate; }
    public function setDamagedBagsRate(?float $rate): self { $this->damagedBagsRate = $rate; return $this; }

    public function isStorageOnPallets(): ?bool { return $this->storageOnPallets; }
    public function setStorageOnPallets(bool $onPallets): self { $this->storageOnPallets = $onPallets; return $this; }

    public function isStorageDryArea(): ?bool { return $this->storageDryArea; }
    public function setStorageDryArea(bool $dry): self { $this->storageDryArea = $dry; return $this; }

    public function isStorageProtected(): ?bool { return $this->storageProtected; }
    public function setStorageProtected(bool $protected): self { $this->storageProtected = $protected; return $this; }

    public function isPestPresence(): ?bool { return $this->pestPresence; }
    public function setPestPresence(bool $pests): self { $this->pestPresence = $pests; return $this; }

    public function isMoldPresence(): ?bool { return $this->moldPresence; }
    public function setMoldPresence(bool $mold): self { $this->moldPresence = $mold; return $this; }

    public function isOdorIssue(): ?bool { return $this->odorIssue; }
    public function setOdorIssue(bool $odor): self { $this->odorIssue = $odor; return $this; }

    public function getCleanlinessScore(): ?int { return $this->cleanlinessScore; }
    public function setCleanlinessScore(?int $score): self { $this->cleanlinessScore = $score; return $this; }

    public function getOverallQualityScore(): ?int { return $this->overallQualityScore; }
    public function setOverallQualityScore(?int $score): self { $this->overallQualityScore = $score; return $this; }

    public function getComment(): ?string { return $this->comment; }
    public function setComment(?string $comment): self { $this->comment = $comment; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
