# Étape 9 — Saisie des données terrain pendant la visite commerciale

## Context

Les étapes 6-8 ont construit l'infrastructure de visites commerciales (création avec check-list auto-générée, affichage détail, liste avec filtres). Mais le commercial ne peut **pas encore enregistrer les données terrain** : relevés prix, contrôles stock, audits qualité/visibilité, commandes, photos. L'étape 9 rend la page détail visite **interactive** en y intégrant les formulaires de saisie.

## Backend Changes

### 1. SalesVisit — Upload photos base64

**Fichier : `src/Entity/SalesVisit.php`**

Ajouter une méthode `setNewPhotos()` (miroir de `Observation::setNewPhotos()`) :
- Propriété `#[SerializedName('newPhotos')]` + `#[Groups(['sales_visit:write'])]` (non persistée)
- Décode chaque base64, écrit dans `public/uploads/sales/`, crée `SalesPhoto` et l'ajoute via `$this->addPhoto()`

### 2. SalesVisit — Exposer `photos` en écriture

Ajouter `sales_visit:write` au groupe de la propriété `$photos` pour permettre l'ajout de photos via le payload de la visite.

### 3. Répertoire uploads

Créer `public/uploads/sales/` (dossier vide avec `.gitkeep`).

## Frontend Changes

### Fichier principal modifié : `pwa/src/app/dashboard/sales/[id]/page.tsx`

Restructuration majeure : la page actuellement en lecture seule devient un **tableau de bord interactif de saisie**. Chaque section audit passe du mode « affichage » au mode « affichage + ajout/édition ».

### Nouveaux composants créés :

| Composant | Rôle |
|-----------|------|
| `PriceAuditForm.tsx` | Formulaire ajout/édition relevé prix (produit, prix attendu, observé, 3 concurrents, promo) |
| `StockAuditForm.tsx` | Formulaire ajout/édition contrôle stock (produit, quantité, rupture, FIFO, fraîcheur, emballage) |
| `QualityAuditForm.tsx` | Formulaire qualité PDV (sacs endommagés, stockage, nuisibles, hygiène, score) |
| `VisibilityAuditForm.tsx` | Formulaire visibilité marque (affiches, banderoles, enseigne, goodies, score) |
| `PreOrderForm.tsx` | Formulaire prise de commande (produit, quantité, prix, statut) |
| `SalesPhotoUpload.tsx` | Upload photos catégorisées (réutilisation de `imageCompressor.ts` + base64) |

### Pattern commun à tous les formulaires :

1. **État local** : `useState` pour chaque champ, `useState` pour le mode édition (ajout vs modification)
2. **Appels API** : raw `fetch` avec token localStorage, `POST` pour création, `PATCH` pour modification, `DELETE` pour suppression
3. **Optimistic update** : mise à jour immédiate du state local, rollback + `fetchVisit()` si erreur
4. **Verrouillage** : tous les formulaires sont désactivés si `visit.closed === true`
5. **Notifications** : `react-hot-toast` succès/erreur
6. **Validation** : basique côté client (champs obligatoires), erreurs serveur affichées via toast
7. **Offline** : si `!navigator.onLine`, ajout à la file d'attente `SyncProvider.addToQueue()`

### Structure de la page détail remaniée :

```
[Header visite + bouton clôture]
[Check-list activités] — inchangé, toggle existant
[Section Prix]       — liste des relevés + bouton "+ Ajouter"
[Section Stock]      — liste des contrôles + bouton "+ Ajouter"  
[Section Qualité]    — formulaire inline (1 seul par visite)
[Section Visibilité] — formulaire inline (1 seul par visite)
[Section Commandes]  — liste des commandes + bouton "+ Ajouter"
[Section Photos]     — grille photos + bouton upload
```

### Types TypeScript

Ajouter les types partagés dans `pwa/src/types/sales.ts` pour éviter la duplication actuelle (interfaces définies en double dans `[id]/page.tsx` et `visits/page.tsx`).

## Plan d'exécution

### Phase A — Backend (20 min)
1. Ajouter `setNewPhotos()` à `SalesVisit` + groupe `sales_visit:write` sur `$photos`
2. Créer `public/uploads/sales/.gitkeep`

### Phase B — Types et utilitaires (15 min)
3. Créer `pwa/src/types/sales.ts` avec toutes les interfaces
4. Mettre à jour les pages existantes pour importer depuis ce fichier

### Phase C — Formulaires (2h)
5. `SalesPhotoUpload.tsx` — upload avec compression + preview
6. `PriceAuditForm.tsx` — formulaire relevé prix
7. `StockAuditForm.tsx` — formulaire contrôle stock
8. `QualityAuditForm.tsx` — formulaire qualité (one-per-visit)
9. `VisibilityAuditForm.tsx` — formulaire visibilité (one-per-visit)
10. `PreOrderForm.tsx` — formulaire commande

### Phase D — Intégration page détail (1h30)
11. Restructurer `[id]/page.tsx` pour intégrer tous les formulaires
12. Gérer le flux : création → mise à jour → suppression pour chaque type d'audit
13. Gérer le verrouillage (visite clôturée = tout désactivé)
14. Gérer le mode offline (file d'attente SyncProvider)

### Phase E — Nettoyage (15 min)
15. Mettre à jour `summary.md`

## Vérification

1. Créer une visite → accéder à la page détail → vérifier que les sections affichent "Aucun relevé" avec bouton "+ Ajouter"
2. Ajouter un relevé prix → vérifier qu'il apparaît dans le tableau
3. Modifier le relevé → vérifier la mise à jour
4. Supprimer le relevé → vérifier la disparition
5. Ajouter un audit qualité → vérifier qu'il apparaît et que le bouton "+ Ajouter" disparaît (one-per-visit)
6. Uploader une photo → vérifier l'aperçu
7. Clôturer la visite → vérifier que tous les formulaires sont désactivés
8. Mode offline : couper le réseau → ajouter un relevé → vérifier le toast "file d'attente"
