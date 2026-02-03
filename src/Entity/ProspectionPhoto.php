<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity]
#[ApiResource(
    operations: [new Get()],
    normalizationContext: ['groups' => ['photo:read']]
)]
class ProspectionPhoto
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['prospection:read', 'photo:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['prospection:read', 'photo:read'])]
    public ?string $contentUrl = null;

    #[ORM\ManyToOne(inversedBy: 'photos')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Prospection $prospection = null;

    public function getId(): ?int { return $this->id; }

    public function setProspection(?Prospection $p): self {
        $this->prospection = $p;
        return $this;
    }
}