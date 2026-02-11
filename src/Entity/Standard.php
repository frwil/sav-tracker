<?php

namespace App\Entity;

use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use Doctrine\ORM\Mapping as ORM;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\ArrayCollection;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity]
#[ApiResource(
    operations: [
        new Get(),
        new GetCollection(),
        new Post(security: "is_granted('ROLE_ADMIN') || is_granted('ROLE_SUPER_ADMIN')"),
        new Patch(security: "is_granted('ROLE_ADMIN')  || is_granted('ROLE_SUPER_ADMIN')")
    ],
    normalizationContext: ['groups' => ['standard:read']],
    denormalizationContext: ['groups' => ['standard:write']]
)]
class Standard
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['standard:read', 'flock:read', 'flock:write'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['standard:read', 'standard:write', 'flock:read'])]
    private ?string $name = null; // Ex: "Cobb 500 - Intensif", "Porc Charcutier - Large White"

    #[ORM\Column(length: 255)]
    #[Groups(['standard:read', 'standard:write', 'flock:read'])]
    private ?string $speculation = null; // Ex: "Poulet de chair", "Porc", "Pondeuse"

    /**
     * Structure attendue du JSON :
     * [
     * { 
     * "day": 1, 
     * "weight": 44,       // Poids en grammes
     * "feed_daily": 12,   // Consommation jour en grammes
     * "feed_cumul": 12,   // Cumul en grammes
     * "phase": "Démarrage",
     * "feed_name": "Aliment Démarrage"
     * },
     * ...
     * ]
     */
    #[ORM\Column(type: 'json')]
    #[Groups(['standard:read', 'standard:write', 'flock:read', 'visit:read'])] 
    private array $curveData = [];

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['standard:read', 'standard:write'])]
    private ?string $feedType = null; // Ex: "Belgocam", "SPC"

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getSpeculation(): ?string
    {
        return $this->speculation;
    }

    public function setSpeculation(string $speculation): self
    {
        $this->speculation = $speculation;
        return $this;
    }

    public function getCurveData(): array
    {
        return $this->curveData;
    }

    public function setCurveData(array $curveData): self
    {
        $this->curveData = $curveData;
        return $this;
    }

    public function getFeedType(): ?string
    {
        return $this->feedType;
    }

    public function setFeedType(?string $feedType): self
    {
        $this->feedType = $feedType;
        return $this;
    }

    /**
     * Récupère les données théoriques complètes pour un jour donné (Age)
     */
    public function getDataForDay(int $day): ?array
    {
        // On suppose que le tableau est trié ou indexé, mais une boucle est plus sûre si les indices manquent
        foreach ($this->curveData as $data) {
            if (isset($data['day']) && $data['day'] == $day) {
                return $data;
            }
        }
        return null;
    }
    
    /**
     * Retourne le nom de l'aliment recommandé.
     * * @param float $value  La valeur d'entrée (Age en jours OU Poids en Kg)
     * @param string $metric 'day' pour l'âge, 'weight' pour le poids
     */
    public function getRecommendedFeed(float $value, string $metric = 'day'): ?string
    {
        // CAS 1 : Recherche par AGE (ex: Poulet, Pondeuse)
        if ($metric === 'day') {
             $data = $this->getDataForDay((int)$value);
             return $data['feed_name'] ?? null;
        }

        // CAS 2 : Recherche par POIDS (ex: Porc, Poisson)
        if ($metric === 'weight') {
            // Conversion : Dans curveData, le poids est en GRAMMES.
            // L'entrée utilisateur ($value) est généralement en KG pour le porc.
            // Si la valeur est petite (< 200), c'est peut-être déjà des grammes (pisciculture alevins),
            // mais pour le porc, on assume KG.
            
            // Logique simple : Si c'est du porc et value < 1000, c'est surement des KG => on convertit.
            // (Un porc de 1000g a 2 jours, un porc de 1000kg n'existe pas, donc le seuil est safe).
            $targetWeightG = ($value < 500) ? $value * 1000 : $value; 

            // On parcourt la courbe pour trouver le stade correspondant à ce poids
            foreach ($this->curveData as $data) {
                $standardWeight = $data['weight'] ?? 0;
                
                // Dès que le poids standard dépasse ou égale le poids actuel de l'animal,
                // c'est qu'on est dans la phase correspondante (ou qu'on vient d'y entrer).
                // On prend une marge de tolérance ou le supérieur immédiat.
                if ($standardWeight >= $targetWeightG) {
                    return $data['feed_name'] ?? null;
                }
            }
            
            // Si on a dépassé le poids max de la courbe, on retourne le dernier aliment (Finition)
            if (!empty($this->curveData)) {
                $last = end($this->curveData);
                return $last['feed_name'] ?? null;
            }
        }

        return null;
    }
}