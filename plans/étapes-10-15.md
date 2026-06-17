# Étapes 10-15 — Finalisation du Module Commercial

## Context

Les étapes 6-9 ont construit l'infrastructure complète de saisie des données terrain. Les étapes 10-15 finalisent le module avec le flux de démarrage visite, l'affichage enrichi, l'intégration dashboard, les rapports, le workflow commandes et le Perfect Store Score.

## Plan global

### Étape 10 — Démarrage de visite (check-in GPS)
### Étape 11 — Affichage des photos
### Étape 12 — Dashboard principal enrichi
### Étape 13 — Rapports et exports commerciaux
### Étape 14 — Workflow commandes
### Étape 15 — Perfect Store Score

---

## Étape 10 — Démarrage de visite (check-in GPS)

### Problème
Les visites commerciales sont créées à l'état « planifiée » mais il n'y a pas de bouton pour les **démarrer** (enregistrer l'arrivée sur site avec GPS).

### Backend
**Créer `StartSalesVisitController`** (`src/Controller/StartSalesVisitController.php`) sur le modèle de `StartVisitController` (technicien) :
- Reçoit `SalesVisit` + `EntityManagerInterface`
- Vérifie : non archivé, non clôturé, pas déjà démarré (`visitedAt === null`)
- Vérifie : l'utilisateur est le commercial assigné (ou admin)
- Définit `visitedAt = new DateTime()`
- Retourne JSON `{ id, status: 'in_progress', visitedAt }`

**Ajouter l'opération API Platform** dans `SalesVisit.php` :
```php
new Patch(
    uriTemplate: '/sales-visits/{id}/start',
    controller: StartSalesVisitController::class,
    input: false,
    name: 'start_sales_visit'
)
```

**Corriger le SalesVisitVoter** : Le check de fenêtre 24h basé sur `visitedAt` doit autoriser l'édition si `visitedAt` est null (visite pas encore démarrée).

### Frontend
**Modifier `pwa/src/app/dashboard/sales/[id]/page.tsx`** :
- Ajouter un bouton « 🚀 Démarrer la visite » quand `isOpen && !visit.visitedAt`
- Au clic : `PATCH /sales-visits/{id}/start` → re-fetch
- Optionnel : capture GPS via `useGeolocation`

**Modifier `pwa/src/app/dashboard/sales/visits/page.tsx`** :
- Ajouter bouton « ▶ Démarrer » sur les cartes de visite en mode `planning`
- PATCH rapide sans navigation

---

## Étape 11 — Affichage des photos

### Problème
Les photos sont stockées mais affichées comme des pastilles texte sans image réelle.

### Frontend uniquement
**Modifier `pwa/src/app/dashboard/sales/[id]/page.tsx`** section photos :
- Remplacer les pastilles texte par des `<img src={API_URL.replace('/api','') + photo.contentUrl}>`
- Ajouter lightbox simple (clic → overlay plein écran)
- Ajouter bouton de suppression par photo
- Afficher la catégorie et légende

---

## Étape 12 — Dashboard principal enrichi

### Problème
Le dashboard principal (`/dashboard`) affiche uniquement les KPIs technicien. Les commerciaux doivent voir leurs KPIs directement sur la page d'accueil.

### Frontend
**Modifier `pwa/src/app/dashboard/page.tsx`** :
- Détecter le rôle utilisateur (`ROLE_SALES_REP`)
- Si commercial : charger `/stats/sales` en plus des stats technicien
- Afficher une ligne de mini-KPIs commerciaux (4-6 cartes) :
  - Call Rate, JP Adherence, Strike Rate, Panier Moyen, Execution Rate
- Adapter la grille de navigation selon le rôle

**Modifier `pwa/src/app/dashboard/layout.tsx`** :
- Adapter le titre/navigation selon le rôle

---

## Étape 13 — Rapports et exports commerciaux

### Problème
Le rapport « Entonnoir Commercial » utilise des données de prospection, pas les données commerciales réelles.

### Backend
Aucun changement — l'endpoint `/stats/sales` existe déjà avec tous les KPIs.

### Frontend
**Réécrire `pwa/src/app/dashboard/reports/commercial/page.tsx`** :
- Charger depuis `/stats/sales` au lieu de `/prospections`
- Graphiques Recharts :
  - **Call Rate & JP Adherence** (BarChart mensuel)
  - **Strike Rate** (LineChart évolution)
  - **Price Compliance vs OOS** (BarChart comparatif)
  - **Qualité vs Visibilité** (RadarChart ou BarChart)
  - **Perfect Store Score** (gauge ou score unique)
- Exports Excel/PDF conservés (déjà fonctionnels, adapter les données)
- Filtres : période + commercial (réutilisation de `ReportFilters`)

---

## Étape 14 — Workflow commandes

### Problème
Le statut des commandes est modifiable librement via un dropdown. Il faut un workflow structuré avec validation des transitions.

### Backend
**3 nouveaux contrôleurs** (pattern `CloseSalesVisitController`) :

1. **`ConfirmPreOrderController`** — `PATCH /pre-orders/{id}/confirm`
   - Vérifie statut actuel = `PREORDER`
   - Passe à `CONFIRMED`

2. **`DeliverPreOrderController`** — `PATCH /pre-orders/{id}/deliver`
   - Vérifie statut actuel = `CONFIRMED`
   - Passe à `DELIVERED` (le `PreUpdate` auto-set `deliveredAt`)

3. **`CancelPreOrderController`** — `PATCH /pre-orders/{id}/cancel`
   - Accepte `cancellationReason` dans le body
   - Vérifie statut actuel ≠ `DELIVERED` (on ne peut pas annuler une commande livrée)
   - Passe à `CANCELLED`

**Ajouter les opérations API Platform** dans `PreOrder.php`.

### Frontend
**Modifier `PreOrderForm.tsx`** et la section commandes de `[id]/page.tsx` :
- Remplacer le dropdown libre par des **boutons d'action contextuels** :
  - `PREORDER` → boutons « ✅ Confirmer » « ❌ Annuler »
  - `CONFIRMED` → boutons « 🚚 Livrer » « ❌ Annuler »
  - `DELIVERED` → aucun bouton (terminal)
  - `CANCELLED` → aucun bouton (terminal)
- Chaque bouton appelle l'endpoint dédié

---

## Étape 15 — Perfect Store Score

### Problème
Les scores individuels existent mais aucun score composite ne donne une vue globale de la performance du point de vente.

### Backend
**Modifier `SalesStatsProvider.php`** :
- Ajouter le calcul du **Perfect Store Score** : moyenne pondérée des scores normalisés sur 100 :
  - Price Compliance (25%)
  - Must Stock Rate (20%)
  - Quality Score (15%, normalisé de /5 à %)
  - Visibility Score (15%, normalisé de /5 à %)
  - Execution Rate (15%)
  - Freshness Score (10%, normalisé de /5 à %)
- Ajouter le champ `perfectStoreScore` à `SalesStats`

**Modifier `SalesStats.php` (ApiResource)** : ajouter le champ `perfectStoreScore`.

### Frontend
**Dashboard commercial** (`sales/page.tsx`) :
- Ajouter une carte « Perfect Store » proéminente (score /100 avec code couleur : ≥80 vert, 50-79 orange, <50 rouge)

**Page détail visite** (`[id]/page.tsx`) :
- Calculer et afficher le Perfect Store Score de la visite en cours
- Afficher dans le header de la visite

---

## Plan d'exécution

Chaque étape est autonome et peut être faite dans l'ordre. Temps estimé total : ~5h.

| Étape | Backend | Frontend | Durée |
|-------|---------|----------|-------|
| 10 — Démarrage visite | StartSalesVisitController + Voter fix | Boutons start (détail + liste) | 45 min |
| 11 — Photos | — | Affichage images + lightbox | 30 min |
| 12 — Dashboard enrichi | — | KPIs commerciaux + nav adaptative | 1h |
| 13 — Rapports | — | Réécriture rapport commercial | 1h30 |
| 14 — Workflow commandes | 3 contrôleurs + routes API | Boutons contextuels | 1h |
| 15 — Perfect Store Score | SalesStatsProvider + ApiResource | Carte dashboard + détail visite | 45 min |

## Fichiers modifiés par étape

### Étape 10
- `src/Controller/StartSalesVisitController.php` (nouveau)
- `src/Entity/SalesVisit.php` (ajout opération API)
- `src/Security/Voter/SalesVisitVoter.php` (fix null visitedAt)
- `pwa/src/app/dashboard/sales/[id]/page.tsx` (bouton start)
- `pwa/src/app/dashboard/sales/visits/page.tsx` (bouton start liste)

### Étape 11
- `pwa/src/app/dashboard/sales/[id]/page.tsx` (refonte section photos)

### Étape 12
- `pwa/src/app/dashboard/page.tsx` (KPIs commerciaux + nav conditionnelle)
- `pwa/src/app/dashboard/layout.tsx` (nav adaptative)

### Étape 13
- `pwa/src/app/dashboard/reports/commercial/page.tsx` (réécriture complète)

### Étape 14
- `src/Controller/ConfirmPreOrderController.php` (nouveau)
- `src/Controller/DeliverPreOrderController.php` (nouveau)
- `src/Controller/CancelPreOrderController.php` (nouveau)
- `src/Entity/PreOrder.php` (ajout opérations API)
- `pwa/src/app/dashboard/sales/[id]/components/PreOrderForm.tsx` (boutons workflow)
- `pwa/src/app/dashboard/sales/[id]/page.tsx` (section commandes)

### Étape 15
- `src/State/SalesStatsProvider.php` (Perfect Store Score)
- `src/ApiResource/SalesStats.php` (nouveau champ)
- `pwa/src/app/dashboard/sales/page.tsx` (carte Perfect Store)
- `pwa/src/app/dashboard/sales/[id]/page.tsx` (score dans header)
- `pwa/src/types/sales.ts` (ajout perfectStoreScore)

## Vérification

1. **Étape 10** : Créer une visite → cliquer « Démarrer » → vérifier `visitedAt` rempli, visite passe en « en cours »
2. **Étape 11** : Uploader une photo → vérifier qu'elle s'affiche en miniature → cliquer → lightbox
3. **Étape 12** : Se connecter en commercial → dashboard affiche les KPIs commerciaux
4. **Étape 13** : Aller dans Rapports → Commercial → vérifier graphiques avec données réelles → exporter Excel/PDF
5. **Étape 14** : Créer une commande → Confirmer → Livrer → vérifier transitions et boutons
6. **Étape 15** : Dashboard commercial → vérifier le Perfect Store Score → cohérence avec les sous-scores
