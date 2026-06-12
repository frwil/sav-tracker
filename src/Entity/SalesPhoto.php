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
    normalizationContext: ['groups' => ['sales_photo:read']],
    denormalizationContext: ['groups' => ['sales_photo:write']]
)]
#[ApiFilter(SearchFilter::class, properties: ['visit' => 'exact', 'category' => 'exact'])]
class SalesPhoto
{
    public const CATEGORY_PRICE = 'PRICE';
    public const CATEGORY_STOCK = 'STOCK';
    public const CATEGORY_QUALITY = 'QUALITY';
    public const CATEGORY_VISIBILITY = 'VISIBILITY';
    public const CATEGORY_GENERAL = 'GENERAL';

    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['sales_photo:read', 'sales_visit:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'photos')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['sales_photo:read', 'sales_photo:write'])]
    private ?SalesVisit $visit = null;

    #[ORM\Column(length: 500)]
    #[Groups(['sales_photo:read', 'sales_photo:write', 'sales_visit:read'])]
    private ?string $contentUrl = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['sales_photo:read', 'sales_photo:write', 'sales_visit:read'])]
    private ?string $caption = null;

    #[ORM\Column(length: 20)]
    #[Groups(['sales_photo:read', 'sales_photo:write', 'sales_visit:read'])]
    private ?string $category = self::CATEGORY_GENERAL;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['sales_photo:read', 'sales_visit:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getVisit(): ?SalesVisit { return $this->visit; }
    public function setVisit(?SalesVisit $visit): self { $this->visit = $visit; return $this; }

    public function getContentUrl(): ?string { return $this->contentUrl; }
    public function setContentUrl(string $url): self { $this->contentUrl = $url; return $this; }

    public function getCaption(): ?string { return $this->caption; }
    public function setCaption(?string $caption): self { $this->caption = $caption; return $this; }

    public function getCategory(): ?string { return $this->category; }
    public function setCategory(string $category): self { $this->category = $category; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
