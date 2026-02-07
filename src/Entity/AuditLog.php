<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post; // 👈 AJOUT
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups; // 👈 AJOUT

#[ORM\Entity]
#[ApiResource(
    operations: [
        new Get(security: "is_granted('ROLE_ADMIN') || is_granted('ROLE_SUPER_ADMIN')"),
        new GetCollection(security: "is_granted('ROLE_ADMIN') || is_granted('ROLE_SUPER_ADMIN')"),
        new Post(
            // On autorise la création, soit par un ADMIN, soit par l'application (ROLE_USER) pour les logs d'erreurs
            security: "is_granted('IS_AUTHENTICATED_FULLY')" 
        )
    ],
    order: ['occurredAt' => 'DESC'],
    normalizationContext: ['groups' => ['audit:read']],     // Lecture
    denormalizationContext: ['groups' => ['audit:write']]   // Écriture
)]
class AuditLog
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['audit:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['audit:read', 'audit:write'])]
    private ?string $action = null; 

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['audit:read', 'audit:write'])]
    private ?string $entityClass = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['audit:read', 'audit:write'])]
    private ?string $entityId = null; 

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['audit:read', 'audit:write'])]
    private ?string $username = null; 

    #[ORM\Column(type: 'json', nullable: true)]
    #[Groups(['audit:read', 'audit:write'])]
    private ?array $changes = null; 

    #[ORM\Column]
    #[Groups(['audit:read'])]
    private ?\DateTimeImmutable $occurredAt = null;

    public function __construct()
    {
        $this->occurredAt = new \DateTimeImmutable();
    }

    // ... (Gardez vos Getters existants) ...
    public function getId(): ?int { return $this->id; }
    public function getAction(): ?string { return $this->action; }
    public function getEntityClass(): ?string { return $this->entityClass; }
    public function getEntityId(): ?string { return $this->entityId; }
    public function getUsername(): ?string { return $this->username; }
    public function getChanges(): ?array { return $this->changes; }
    public function getOccurredAt(): ?\DateTimeImmutable { return $this->occurredAt; }

    // ... (Ajoutez les Setters pour l'écriture API) ...
    public function setAction(string $action): self { $this->action = $action; return $this; }
    public function setEntityClass(?string $entityClass): self { $this->entityClass = $entityClass; return $this; }
    public function setEntityId(?string $entityId): self { $this->entityId = $entityId; return $this; }
    public function setUsername(?string $username): self { $this->username = $username; return $this; }
    public function setChanges(?array $changes): self { $this->changes = $changes; return $this; }
}