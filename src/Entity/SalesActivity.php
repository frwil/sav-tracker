<?php

namespace App\Entity;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
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
    normalizationContext: ['groups' => ['sales_activity:read']],
    denormalizationContext: ['groups' => ['sales_activity:write']]
)]
#[ApiFilter(SearchFilter::class, properties: ['visit' => 'exact', 'activityType' => 'exact'])]
#[ApiFilter(BooleanFilter::class, properties: ['isCompleted'])]
class SalesActivity
{
    // Types d'activités de la check-list visite commerciale
    public const TYPE_STOCK_CHECK = 'STOCK_CHECK';
    public const TYPE_PRICE_CHECK = 'PRICE_CHECK';
    public const TYPE_QUALITY_CHECK = 'QUALITY_CHECK';
    public const TYPE_VISIBILITY_CHECK = 'VISIBILITY_CHECK';
    public const TYPE_ORDER_TAKING = 'ORDER_TAKING';
    public const TYPE_MANAGER_INTERVIEW = 'MANAGER_INTERVIEW';
    public const TYPE_PHOTO_REPORT = 'PHOTO_REPORT';
    public const TYPE_MERCHANDISING = 'MERCHANDISING';
    public const TYPE_PROMO_CHECK = 'PROMO_CHECK';

    public static function getTypes(): array
    {
        return [
            self::TYPE_STOCK_CHECK => 'Vérification stock',
            self::TYPE_PRICE_CHECK => 'Relevé des prix',
            self::TYPE_QUALITY_CHECK => 'Contrôle qualité',
            self::TYPE_VISIBILITY_CHECK => 'Contrôle visibilité',
            self::TYPE_ORDER_TAKING => 'Prise de commande',
            self::TYPE_MANAGER_INTERVIEW => 'Entretien gérant',
            self::TYPE_PHOTO_REPORT => 'Reportage photo',
            self::TYPE_MERCHANDISING => 'Merchandising / facing',
            self::TYPE_PROMO_CHECK => 'Vérification promotion',
        ];
    }

    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['sales_activity:read', 'sales_visit:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'salesActivities')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['sales_activity:read', 'sales_activity:write'])]
    private ?SalesVisit $visit = null;

    #[ORM\Column(length: 30)]
    #[Groups(['sales_activity:read', 'sales_activity:write', 'sales_visit:read'])]
    private ?string $activityType = null;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['sales_activity:read', 'sales_activity:write', 'sales_visit:read'])]
    private ?bool $isCompleted = false;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['sales_activity:read', 'sales_activity:write', 'sales_visit:read'])]
    private ?\DateTimeInterface $completedAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['sales_activity:read', 'sales_activity:write', 'sales_visit:read'])]
    private ?string $comment = null;

    #[ORM\Column(type: Types::SMALLINT, options: ['default' => 0])]
    #[Groups(['sales_activity:read', 'sales_activity:write', 'sales_visit:read'])]
    private ?int $sortOrder = 0;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['sales_activity:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getVisit(): ?SalesVisit { return $this->visit; }
    public function setVisit(?SalesVisit $visit): self { $this->visit = $visit; return $this; }

    public function getActivityType(): ?string { return $this->activityType; }
    public function setActivityType(string $type): self { $this->activityType = $type; return $this; }

    public function isCompleted(): ?bool { return $this->isCompleted; }
    public function setCompleted(bool $completed): self {
        $this->isCompleted = $completed;
        if ($completed && !$this->completedAt) {
            $this->completedAt = new \DateTime();
        }
        return $this;
    }

    public function getCompletedAt(): ?\DateTimeInterface { return $this->completedAt; }
    public function setCompletedAt(?\DateTimeInterface $date): self { $this->completedAt = $date; return $this; }

    public function getComment(): ?string { return $this->comment; }
    public function setComment(?string $comment): self { $this->comment = $comment; return $this; }

    public function getSortOrder(): ?int { return $this->sortOrder; }
    public function setSortOrder(int $order): self { $this->sortOrder = $order; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
