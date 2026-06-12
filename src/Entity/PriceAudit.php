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
    normalizationContext: ['groups' => ['price_audit:read']],
    denormalizationContext: ['groups' => ['price_audit:write']]
)]
#[ApiFilter(SearchFilter::class, properties: ['visit' => 'exact', 'productCode' => 'exact'])]
class PriceAudit
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['price_audit:read', 'sales_visit:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'priceAudits')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['price_audit:read', 'price_audit:write'])]
    private ?SalesVisit $visit = null;

    #[ORM\Column(length: 50)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?string $productCode = null;

    #[ORM\Column(length: 255)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?string $productName = null;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?float $expectedPrice = null;

    #[ORM\Column(type: Types::FLOAT)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?float $observedPrice = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?string $competitor1Name = null;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?float $competitor1Price = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?string $competitor2Name = null;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?float $competitor2Price = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?string $competitor3Name = null;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?float $competitor3Price = null;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?bool $isPromoActive = false;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?float $promoPrice = null;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?bool $priceCompliance = false;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['price_audit:read', 'price_audit:write', 'sales_visit:read'])]
    private ?string $comment = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['price_audit:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
        // Auto-déterminer la conformité prix
        if ($this->expectedPrice !== null && $this->observedPrice !== null) {
            $this->priceCompliance = abs($this->expectedPrice - $this->observedPrice) < 0.01;
        }
    }

    public function getId(): ?int { return $this->id; }

    public function getVisit(): ?SalesVisit { return $this->visit; }
    public function setVisit(?SalesVisit $visit): self { $this->visit = $visit; return $this; }

    public function getProductCode(): ?string { return $this->productCode; }
    public function setProductCode(string $productCode): self { $this->productCode = $productCode; return $this; }

    public function getProductName(): ?string { return $this->productName; }
    public function setProductName(string $productName): self { $this->productName = $productName; return $this; }

    public function getExpectedPrice(): ?float { return $this->expectedPrice; }
    public function setExpectedPrice(?float $expectedPrice): self { $this->expectedPrice = $expectedPrice; return $this; }

    public function getObservedPrice(): ?float { return $this->observedPrice; }
    public function setObservedPrice(float $observedPrice): self { $this->observedPrice = $observedPrice; return $this; }

    public function getCompetitor1Name(): ?string { return $this->competitor1Name; }
    public function setCompetitor1Name(?string $name): self { $this->competitor1Name = $name; return $this; }

    public function getCompetitor1Price(): ?float { return $this->competitor1Price; }
    public function setCompetitor1Price(?float $price): self { $this->competitor1Price = $price; return $this; }

    public function getCompetitor2Name(): ?string { return $this->competitor2Name; }
    public function setCompetitor2Name(?string $name): self { $this->competitor2Name = $name; return $this; }

    public function getCompetitor2Price(): ?float { return $this->competitor2Price; }
    public function setCompetitor2Price(?float $price): self { $this->competitor2Price = $price; return $this; }

    public function getCompetitor3Name(): ?string { return $this->competitor3Name; }
    public function setCompetitor3Name(?string $name): self { $this->competitor3Name = $name; return $this; }

    public function getCompetitor3Price(): ?float { return $this->competitor3Price; }
    public function setCompetitor3Price(?float $price): self { $this->competitor3Price = $price; return $this; }

    public function isPromoActive(): ?bool { return $this->isPromoActive; }
    public function setPromoActive(bool $active): self { $this->isPromoActive = $active; return $this; }

    public function getPromoPrice(): ?float { return $this->promoPrice; }
    public function setPromoPrice(?float $price): self { $this->promoPrice = $price; return $this; }

    public function isPriceCompliance(): ?bool { return $this->priceCompliance; }
    public function setPriceCompliance(bool $compliance): self { $this->priceCompliance = $compliance; return $this; }

    public function getComment(): ?string { return $this->comment; }
    public function setComment(?string $comment): self { $this->comment = $comment; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
