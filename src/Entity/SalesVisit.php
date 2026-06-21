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
use App\Controller\CloseSalesVisitController;
use App\Controller\StartSalesVisitController;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Doctrine\Orm\Filter\BooleanFilter;
use ApiPlatform\Doctrine\Orm\Filter\DateFilter;
use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
#[ApiResource(
    operations: [
        new Get(security: "is_granted('ROLE_SALES_REP') or is_granted('ROLE_ADMIN') or is_granted('ROLE_SUPER_ADMIN')"),
        new GetCollection(security: "is_granted('ROLE_SALES_REP') or is_granted('ROLE_ADMIN') or is_granted('ROLE_SUPER_ADMIN')"),
        new Post(
            security: "is_granted('ROLE_SALES_REP')"
        ),
        new Patch(
            security: "is_granted('SALES_VISIT_EDIT', object)"
        ),
        new Delete(
            security: "is_granted('SALES_VISIT_DELETE', object)"
        ),
        new Patch(
            uriTemplate: '/sales-visits/{id}/close',
            controller: CloseSalesVisitController::class,
            openapi: new \ApiPlatform\OpenApi\Model\Operation(
                summary: 'Clôturer une visite commerciale',
                description: 'Marque la visite commerciale comme terminée et verrouille les modifications.',
                requestBody: new \ApiPlatform\OpenApi\Model\RequestBody(
                    content: new \ArrayObject([
                        'application/json' => new \ApiPlatform\OpenApi\Model\MediaType(
                            schema: new \ApiPlatform\OpenApi\Model\Schema()
                        )
                    ])
                )
            ),
            denormalizationContext: ['groups' => []],
            input: false,
            name: 'close_sales_visit'
        ),
        new Patch(
            uriTemplate: '/sales-visits/{id}/start',
            controller: StartSalesVisitController::class,
            openapi: new \ApiPlatform\OpenApi\Model\Operation(
                summary: 'Démarrer une visite commerciale',
                description: 'Enregistre l\'arrivée du commercial sur le point de vente.',
                requestBody: new \ApiPlatform\OpenApi\Model\RequestBody(
                    content: new \ArrayObject([
                        'application/json' => new \ApiPlatform\OpenApi\Model\MediaType(
                            schema: new \ApiPlatform\OpenApi\Model\Schema()
                        )
                    ])
                )
            ),
            denormalizationContext: ['groups' => []],
            input: false,
            name: 'start_sales_visit'
        )
    ],
    normalizationContext: ['groups' => ['sales_visit:read']],
    denormalizationContext: ['groups' => ['sales_visit:write']]
)]
#[ApiFilter(SearchFilter::class, properties: ['customer' => 'exact', 'salesRep' => 'exact'])]
#[ApiFilter(BooleanFilter::class, properties: ['closed', 'activated'])]
#[ApiFilter(DateFilter::class, properties: ['visitedAt', 'plannedAt'])]
#[ApiFilter(OrderFilter::class, properties: ['visitedAt' => 'DESC', 'plannedAt' => 'DESC'])]
class SalesVisit
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['sales_visit:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private ?User $salesRep = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private ?Customer $customer = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private ?\DateTimeInterface $plannedAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private ?\DateTimeInterface $visitedAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['sales_visit:read'])]
    private ?\DateTimeInterface $completedAt = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private ?string $gpsCoordinates = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    #[Assert\NotBlank(message: "L'objectif de la visite commerciale est obligatoire.")]
    private ?string $objective = 'Visite commerciale';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private ?string $generalComment = null;

    #[ORM\Column(options: ['default' => false])]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private ?bool $closed = false;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['sales_visit:read'])]
    private ?bool $activated = true;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    #[Groups(['sales_visit:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\OneToMany(mappedBy: 'visit', targetEntity: PriceAudit::class, cascade: ['persist', 'remove'])]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private Collection $priceAudits;

    #[ORM\OneToMany(mappedBy: 'visit', targetEntity: StockAudit::class, cascade: ['persist', 'remove'])]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private Collection $stockAudits;

    #[ORM\OneToOne(mappedBy: 'visit', targetEntity: QualityAudit::class, cascade: ['persist', 'remove'])]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private ?QualityAudit $qualityAudit = null;

    #[ORM\OneToOne(mappedBy: 'visit', targetEntity: VisibilityAudit::class, cascade: ['persist', 'remove'])]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private ?VisibilityAudit $visibilityAudit = null;

    #[ORM\OneToMany(mappedBy: 'visit', targetEntity: PreOrder::class, cascade: ['persist', 'remove'])]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private Collection $preOrders;

    #[ORM\OneToMany(mappedBy: 'visit', targetEntity: SalesActivity::class, cascade: ['persist', 'remove'])]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private Collection $salesActivities;

    #[ORM\OneToMany(mappedBy: 'visit', targetEntity: SalesPhoto::class, cascade: ['persist', 'remove'])]
    #[Groups(['sales_visit:read', 'sales_visit:write'])]
    private Collection $photos;

    public function __construct()
    {
        $this->priceAudits = new ArrayCollection();
        $this->stockAudits = new ArrayCollection();
        $this->preOrders = new ArrayCollection();
        $this->salesActivities = new ArrayCollection();
        $this->photos = new ArrayCollection();
    }

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getSalesRep(): ?User { return $this->salesRep; }
    public function setSalesRep(?User $salesRep): self { $this->salesRep = $salesRep; return $this; }

    public function getCustomer(): ?Customer { return $this->customer; }
    public function setCustomer(?Customer $customer): self { $this->customer = $customer; return $this; }

    public function getPlannedAt(): ?\DateTimeInterface { return $this->plannedAt; }
    public function setPlannedAt(?\DateTimeInterface $plannedAt): self { $this->plannedAt = $plannedAt; return $this; }

    public function getVisitedAt(): ?\DateTimeInterface { return $this->visitedAt; }
    public function setVisitedAt(?\DateTimeInterface $visitedAt): self { $this->visitedAt = $visitedAt; return $this; }

    public function getCompletedAt(): ?\DateTimeInterface { return $this->completedAt; }
    public function setCompletedAt(?\DateTimeInterface $completedAt): self { $this->completedAt = $completedAt; return $this; }

    public function getGpsCoordinates(): ?string { return $this->gpsCoordinates; }
    public function setGpsCoordinates(?string $gpsCoordinates): self { $this->gpsCoordinates = $gpsCoordinates; return $this; }

    public function getObjective(): ?string { return $this->objective; }
    public function setObjective(?string $objective): self { $this->objective = $objective; return $this; }

    public function getGeneralComment(): ?string { return $this->generalComment; }
    public function setGeneralComment(?string $generalComment): self { $this->generalComment = $generalComment; return $this; }

    public function isClosed(): ?bool { return $this->closed; }
    public function setClosed(bool $closed): self { $this->closed = $closed; return $this; }

    public function isActivated(): ?bool { return $this->activated; }
    public function setActivated(bool $activated): self { $this->activated = $activated; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }

    /**
     * Écart en jours entre la date planifiée et la date réelle (JP Adherence).
     * 0 = visite faite le jour prévu.
     */
    public function getPlanningDeviation(): ?int
    {
        if (!$this->plannedAt || !$this->visitedAt) return null;
        return (int) (new \DateTime($this->plannedAt->format('Y-m-d')))
            ->diff(new \DateTime($this->visitedAt->format('Y-m-d')))->days;
    }

    /** @return Collection<int, PriceAudit> */
    public function getPriceAudits(): Collection { return $this->priceAudits; }
    public function addPriceAudit(PriceAudit $audit): self {
        if (!$this->priceAudits->contains($audit)) {
            $this->priceAudits->add($audit);
            $audit->setVisit($this);
        }
        return $this;
    }
    public function removePriceAudit(PriceAudit $audit): self {
        if ($this->priceAudits->removeElement($audit)) {
            if ($audit->getVisit() === $this) { $audit->setVisit(null); }
        }
        return $this;
    }

    /** @return Collection<int, StockAudit> */
    public function getStockAudits(): Collection { return $this->stockAudits; }
    public function addStockAudit(StockAudit $audit): self {
        if (!$this->stockAudits->contains($audit)) {
            $this->stockAudits->add($audit);
            $audit->setVisit($this);
        }
        return $this;
    }
    public function removeStockAudit(StockAudit $audit): self {
        if ($this->stockAudits->removeElement($audit)) {
            if ($audit->getVisit() === $this) { $audit->setVisit(null); }
        }
        return $this;
    }

    public function getQualityAudit(): ?QualityAudit { return $this->qualityAudit; }
    public function setQualityAudit(?QualityAudit $audit): self {
        if ($audit !== null) { $audit->setVisit($this); }
        $this->qualityAudit = $audit;
        return $this;
    }

    public function getVisibilityAudit(): ?VisibilityAudit { return $this->visibilityAudit; }
    public function setVisibilityAudit(?VisibilityAudit $audit): self {
        if ($audit !== null) { $audit->setVisit($this); }
        $this->visibilityAudit = $audit;
        return $this;
    }

    /** @return Collection<int, PreOrder> */
    public function getPreOrders(): Collection { return $this->preOrders; }
    public function addPreOrder(PreOrder $order): self {
        if (!$this->preOrders->contains($order)) {
            $this->preOrders->add($order);
            $order->setVisit($this);
        }
        return $this;
    }
    public function removePreOrder(PreOrder $order): self {
        if ($this->preOrders->removeElement($order)) {
            if ($order->getVisit() === $this) { $order->setVisit(null); }
        }
        return $this;
    }

    /** @return Collection<int, SalesActivity> */
    public function getSalesActivities(): Collection { return $this->salesActivities; }
    public function addSalesActivity(SalesActivity $activity): self {
        if (!$this->salesActivities->contains($activity)) {
            $this->salesActivities->add($activity);
            $activity->setVisit($this);
        }
        return $this;
    }
    public function removeSalesActivity(SalesActivity $activity): self {
        if ($this->salesActivities->removeElement($activity)) {
            if ($activity->getVisit() === $this) { $activity->setVisit(null); }
        }
        return $this;
    }

    /** @return Collection<int, SalesPhoto> */
    public function getPhotos(): Collection { return $this->photos; }
    public function addPhoto(SalesPhoto $photo): self {
        if (!$this->photos->contains($photo)) {
            $this->photos->add($photo);
            $photo->setVisit($this);
        }
        return $this;
    }
    public function removePhoto(SalesPhoto $photo): self {
        if ($this->photos->removeElement($photo)) {
            if ($photo->getVisit() === $this) { $photo->setVisit(null); }
        }
        return $this;
    }

    /**
     * Accepte un tableau de photos en base64 et les transforme en entités SalesPhoto.
     * Miroir de Observation::setNewPhotos().
     */
    #[SerializedName('newPhotos')]
    #[Groups(['sales_visit:write'])]
    public function setNewPhotos(array $newPhotos): self
    {
        foreach ($newPhotos as $photoData) {
            if (empty($photoData['content'])) continue;

            $data = explode(',', $photoData['content']);
            $content = base64_decode(end($data));

            $filename = uniqid('sales_') . '.jpg';
            $path = 'uploads/sales/' . $filename;

            file_put_contents($path, $content);

            $photo = new SalesPhoto();
            $photo->setContentUrl('/uploads/sales/' . $filename);
            $photo->setCategory($photoData['category'] ?? 'GENERAL');
            $photo->setCaption($photoData['caption'] ?? null);
            $photo->setVisit($this);

            $this->photos->add($photo);
        }
        return $this;
    }
}
