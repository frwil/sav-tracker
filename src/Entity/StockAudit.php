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
        new Get(),
        new GetCollection(),
        new Post(),
        new Patch(),
        new Delete()
    ],
    normalizationContext: ['groups' => ['stock_audit:read']],
    denormalizationContext: ['groups' => ['stock_audit:write']]
)]
#[ApiFilter(SearchFilter::class, properties: ['visit' => 'exact', 'productCode' => 'exact'])]
#[ApiFilter(BooleanFilter::class, properties: ['isOutOfStock', 'isMustStock'])]
class StockAudit
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['stock_audit:read', 'sales_visit:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'stockAudits')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['stock_audit:read', 'stock_audit:write'])]
    private ?SalesVisit $visit = null;

    #[ORM\Column(length: 50)]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?string $productCode = null;

    #[ORM\Column(length: 255)]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?string $productName = null;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?bool $isMustStock = false;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?float $stockQuantity = null;

    #[ORM\Column(length: 10, options: ['default' => 'SAC'])]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?string $stockUnit = 'SAC';

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?bool $isOutOfStock = false;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?bool $isFifoCompliant = true;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?\DateTimeInterface $oldestMfgDate = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?\DateTimeInterface $expiryDate = null;

    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?int $freshnessScore = null; // 1 (périmé) à 5 (très frais)

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?bool $packagingIntact = true;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['stock_audit:read', 'stock_audit:write', 'sales_visit:read'])]
    private ?string $comment = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['stock_audit:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getVisit(): ?SalesVisit { return $this->visit; }
    public function setVisit(?SalesVisit $visit): self { $this->visit = $visit; return $this; }

    public function getProductCode(): ?string { return $this->productCode; }
    public function setProductCode(string $productCode): self { $this->productCode = $productCode; return $this; }

    public function getProductName(): ?string { return $this->productName; }
    public function setProductName(string $productName): self { $this->productName = $productName; return $this; }

    public function isMustStock(): ?bool { return $this->isMustStock; }
    public function setMustStock(bool $mustStock): self { $this->isMustStock = $mustStock; return $this; }

    public function getStockQuantity(): ?float { return $this->stockQuantity; }
    public function setStockQuantity(?float $quantity): self { $this->stockQuantity = $quantity; return $this; }

    public function getStockUnit(): ?string { return $this->stockUnit; }
    public function setStockUnit(string $unit): self { $this->stockUnit = $unit; return $this; }

    public function isOutOfStock(): ?bool { return $this->isOutOfStock; }
    public function setOutOfStock(bool $oos): self { $this->isOutOfStock = $oos; return $this; }

    public function isFifoCompliant(): ?bool { return $this->isFifoCompliant; }
    public function setFifoCompliant(bool $fifo): self { $this->isFifoCompliant = $fifo; return $this; }

    public function getOldestMfgDate(): ?\DateTimeInterface { return $this->oldestMfgDate; }
    public function setOldestMfgDate(?\DateTimeInterface $date): self { $this->oldestMfgDate = $date; return $this; }

    public function getExpiryDate(): ?\DateTimeInterface { return $this->expiryDate; }
    public function setExpiryDate(?\DateTimeInterface $date): self { $this->expiryDate = $date; return $this; }

    public function getFreshnessScore(): ?int { return $this->freshnessScore; }
    public function setFreshnessScore(?int $score): self { $this->freshnessScore = $score; return $this; }

    public function isPackagingIntact(): ?bool { return $this->packagingIntact; }
    public function setPackagingIntact(bool $intact): self { $this->packagingIntact = $intact; return $this; }

    public function getComment(): ?string { return $this->comment; }
    public function setComment(?string $comment): self { $this->comment = $comment; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
