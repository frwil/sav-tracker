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
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use App\Controller\ConfirmPreOrderController;
use App\Controller\DeliverPreOrderController;
use App\Controller\CancelPreOrderController;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(security: "is_granted('ROLE_SALES_REP') or is_granted('ROLE_ADMIN') or is_granted('ROLE_SUPER_ADMIN')"),
        new GetCollection(security: "is_granted('ROLE_SALES_REP') or is_granted('ROLE_ADMIN') or is_granted('ROLE_SUPER_ADMIN')"),
        new Post(security: "is_granted('ROLE_SALES_REP')"),
        new Patch(security: "is_granted('ROLE_SALES_REP')"),
        new Delete(security: "is_granted('ROLE_SALES_REP')"),
        new Patch(
            uriTemplate: '/pre-orders/{id}/confirm',
            controller: ConfirmPreOrderController::class,
            security: "is_granted('ROLE_SALES_REP')",
            denormalizationContext: ['groups' => []],
            input: false,
            name: 'confirm_pre_order'
        ),
        new Patch(
            uriTemplate: '/pre-orders/{id}/deliver',
            controller: DeliverPreOrderController::class,
            security: "is_granted('ROLE_SALES_REP')",
            denormalizationContext: ['groups' => []],
            input: false,
            name: 'deliver_pre_order'
        ),
        new Patch(
            uriTemplate: '/pre-orders/{id}/cancel',
            controller: CancelPreOrderController::class,
            security: "is_granted('ROLE_SALES_REP')",
            denormalizationContext: ['groups' => []],
            name: 'cancel_pre_order'
        ),
    ],
    normalizationContext: ['groups' => ['pre_order:read']],
    denormalizationContext: ['groups' => ['pre_order:write']]
)]
#[ApiFilter(SearchFilter::class, properties: [
    'visit' => 'exact',
    'customer' => 'exact',
    'status' => 'exact',
    'productCode' => 'exact'
])]
#[ApiFilter(DateFilter::class, properties: ['expectedDeliveryAt', 'deliveredAt'])]
#[ApiFilter(OrderFilter::class, properties: ['createdAt' => 'DESC', 'expectedDeliveryAt' => 'DESC'])]
class PreOrder
{
    public const STATUS_PREORDER = 'PREORDER';
    public const STATUS_CONFIRMED = 'CONFIRMED';
    public const STATUS_DELIVERED = 'DELIVERED';
    public const STATUS_CANCELLED = 'CANCELLED';

    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['pre_order:read', 'sales_visit:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'preOrders')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['pre_order:read', 'pre_order:write'])]
    private ?SalesVisit $visit = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?Customer $customer = null;

    #[ORM\Column(length: 50)]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?string $productCode = null;

    #[ORM\Column(length: 255)]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?string $productName = null;

    #[ORM\Column(type: Types::FLOAT)]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?float $quantity = null;

    #[ORM\Column(length: 10, options: ['default' => 'SAC'])]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?string $unit = 'SAC';

    #[ORM\Column(type: Types::FLOAT)]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?float $unitPrice = null;

    #[ORM\Column(type: Types::FLOAT)]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?float $totalValue = null;

    #[ORM\Column(length: 20, options: ['default' => self::STATUS_PREORDER])]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?string $status = self::STATUS_PREORDER;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?\DateTimeInterface $expectedDeliveryAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?\DateTimeInterface $deliveredAt = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?string $cancellationReason = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['pre_order:read', 'pre_order:write', 'sales_visit:read'])]
    private ?string $comment = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['pre_order:read', 'sales_visit:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['pre_order:read'])]
    private ?\DateTimeInterface $updatedAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
        // Calcul automatique de la valeur totale
        if ($this->quantity !== null && $this->unitPrice !== null) {
            $this->totalValue = round($this->quantity * $this->unitPrice, 2);
        }
    }

    #[ORM\PreUpdate]
    public function setUpdatedAtValue(): void
    {
        $this->updatedAt = new \DateTime();
        // Auto-set deliveredAt quand le statut passe à DELIVERED
        if ($this->status === self::STATUS_DELIVERED && $this->deliveredAt === null) {
            $this->deliveredAt = new \DateTime();
        }
    }

    public function getId(): ?int { return $this->id; }

    public function getVisit(): ?SalesVisit { return $this->visit; }
    public function setVisit(?SalesVisit $visit): self { $this->visit = $visit; return $this; }

    public function getCustomer(): ?Customer { return $this->customer; }
    public function setCustomer(?Customer $customer): self { $this->customer = $customer; return $this; }

    public function getProductCode(): ?string { return $this->productCode; }
    public function setProductCode(string $productCode): self { $this->productCode = $productCode; return $this; }

    public function getProductName(): ?string { return $this->productName; }
    public function setProductName(string $productName): self { $this->productName = $productName; return $this; }

    public function getQuantity(): ?float { return $this->quantity; }
    public function setQuantity(float $quantity): self { $this->quantity = $quantity; return $this; }

    public function getUnit(): ?string { return $this->unit; }
    public function setUnit(string $unit): self { $this->unit = $unit; return $this; }

    public function getUnitPrice(): ?float { return $this->unitPrice; }
    public function setUnitPrice(float $unitPrice): self { $this->unitPrice = $unitPrice; return $this; }

    public function getTotalValue(): ?float { return $this->totalValue; }
    public function setTotalValue(float $totalValue): self { $this->totalValue = $totalValue; return $this; }

    public function getStatus(): ?string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }

    public function getExpectedDeliveryAt(): ?\DateTimeInterface { return $this->expectedDeliveryAt; }
    public function setExpectedDeliveryAt(?\DateTimeInterface $date): self { $this->expectedDeliveryAt = $date; return $this; }

    public function getDeliveredAt(): ?\DateTimeInterface { return $this->deliveredAt; }
    public function setDeliveredAt(?\DateTimeInterface $date): self { $this->deliveredAt = $date; return $this; }

    public function getCancellationReason(): ?string { return $this->cancellationReason; }
    public function setCancellationReason(?string $reason): self { $this->cancellationReason = $reason; return $this; }

    public function getComment(): ?string { return $this->comment; }
    public function setComment(?string $comment): self { $this->comment = $comment; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeInterface { return $this->updatedAt; }

    /** Helper : la commande est-elle gagnée (livrée) ? */
    public function isWon(): bool { return $this->status === self::STATUS_DELIVERED; }
}
