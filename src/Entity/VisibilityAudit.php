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
        new Get(),
        new GetCollection(),
        new Post(),
        new Patch(),
        new Delete()
    ],
    normalizationContext: ['groups' => ['visibility_audit:read']],
    denormalizationContext: ['groups' => ['visibility_audit:write']]
)]
#[ApiFilter(SearchFilter::class, properties: ['visit' => 'exact'])]
class VisibilityAudit
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['visibility_audit:read', 'sales_visit:read'])]
    private ?int $id = null;

    #[ORM\OneToOne(inversedBy: 'visibilityAudit')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['visibility_audit:read', 'visibility_audit:write'])]
    private ?SalesVisit $visit = null;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['visibility_audit:read', 'visibility_audit:write', 'sales_visit:read'])]
    private ?bool $hasPosters = false;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['visibility_audit:read', 'visibility_audit:write', 'sales_visit:read'])]
    private ?bool $hasBanners = false;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['visibility_audit:read', 'visibility_audit:write', 'sales_visit:read'])]
    private ?bool $hasCalendars = false;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['visibility_audit:read', 'visibility_audit:write', 'sales_visit:read'])]
    private ?bool $hasBrandedSacs = false;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['visibility_audit:read', 'visibility_audit:write', 'sales_visit:read'])]
    private ?bool $signageVisible = false;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    #[Groups(['visibility_audit:read', 'visibility_audit:write', 'sales_visit:read'])]
    private ?array $brandedItems = null; // ex: ['aprons', 'caps', 't-shirts']

    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    #[Groups(['visibility_audit:read', 'visibility_audit:write', 'sales_visit:read'])]
    private ?int $ourVisibilityPercent = null; // % estimé de visibilité marque vs concurrence

    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    #[Groups(['visibility_audit:read', 'visibility_audit:write', 'sales_visit:read'])]
    private ?int $overallVisibilityScore = null; // 1 (invisible) à 5 (omniprésent)

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['visibility_audit:read', 'visibility_audit:write', 'sales_visit:read'])]
    private ?string $comment = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['visibility_audit:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getVisit(): ?SalesVisit { return $this->visit; }
    public function setVisit(?SalesVisit $visit): self { $this->visit = $visit; return $this; }

    public function hasPosters(): ?bool { return $this->hasPosters; }
    public function setHasPosters(bool $posters): self { $this->hasPosters = $posters; return $this; }

    public function hasBanners(): ?bool { return $this->hasBanners; }
    public function setHasBanners(bool $banners): self { $this->hasBanners = $banners; return $this; }

    public function hasCalendars(): ?bool { return $this->hasCalendars; }
    public function setHasCalendars(bool $calendars): self { $this->hasCalendars = $calendars; return $this; }

    public function hasBrandedSacs(): ?bool { return $this->hasBrandedSacs; }
    public function setHasBrandedSacs(bool $sacs): self { $this->hasBrandedSacs = $sacs; return $this; }

    public function isSignageVisible(): ?bool { return $this->signageVisible; }
    public function setSignageVisible(bool $visible): self { $this->signageVisible = $visible; return $this; }

    public function getBrandedItems(): ?array { return $this->brandedItems; }
    public function setBrandedItems(?array $items): self { $this->brandedItems = $items; return $this; }

    public function getOurVisibilityPercent(): ?int { return $this->ourVisibilityPercent; }
    public function setOurVisibilityPercent(?int $percent): self { $this->ourVisibilityPercent = $percent; return $this; }

    public function getOverallVisibilityScore(): ?int { return $this->overallVisibilityScore; }
    public function setOverallVisibilityScore(?int $score): self { $this->overallVisibilityScore = $score; return $this; }

    public function getComment(): ?string { return $this->comment; }
    public function setComment(?string $comment): self { $this->comment = $comment; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
