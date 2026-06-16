# SAV Tracker — Résumé des Fonctionnalités

## 🎯 Objectif de l'application

SAV Tracker est une **PWA (Progressive Web App) de suivi des équipes terrain** dans le secteur de l'élevage. L'application couvre **deux modules distincts** :

| Module | Acteur | Lieu de visite | Expertise |
|--------|--------|---------------|-----------|
| **Module 1 — Suivi technique** | Technicien d'élevage | **Ferme** (chez l'éleveur) | Zootechnique, santé animale, nutrition |
| **Module 2 — Suivi commercial** | Commercial | **Provenderie** (point de vente d'aliments) | Purement commerciale (vente, merchandising) |

Les deux partagent la même infrastructure **offline-first** pour fonctionner sans connexion dans les zones rurales.

---

## 🏗️ Architecture technique

| Composant | Technologies |
|-----------|-------------|
| **Backend API** | Symfony 8.0, API Platform 4.2, Doctrine ORM 3.6, PostgreSQL |
| **Authentification** | JWT (LexikJWTAuthenticationBundle), rôles hiérarchiques |
| **Frontend PWA** | Next.js 16, React 19, Tailwind CSS 4, TanStack React Query |
| **Stockage offline** | IndexedDB (localforage), localStorage avec TTL |
| **Graphiques** | Recharts, ExcelJS, jsPDF, html-to-image |
| **Infrastructure** | Docker, FrankenPHP + Caddy, Redis/Messenger |

---

## 📱 Fonctionnalités partagées

### 1. Authentification et mode offline
- Connexion par JWT (login/mot de passe)
- **Période de grâce offline de 7 jours** : l'agent peut continuer à travailler sans connexion
- Détection automatique de l'état réseau (online/offline)
- Cache utilisateur local avec expiration

### 2. PWA — Fonctionnalités offline-first
- **Cache React Query** persistant dans IndexedDB → consultation des données sans réseau
- **File d'attente de synchronisation** → les modifications faites offline sont synchronisées au retour de connexion
- Cache localStorage avec nettoyage automatique (TTL de 30 jours)
- Composant **CacheWarmer** pour précharger les données
- Monitoring de la **qualité réseau**
- Mode **partial data** : fallback sur les données de liste si le détail n'est pas en cache

### 3. Audit et traçabilité
- **Journal d'audit** automatique pour toutes les opérations CRUD
- Enregistre : action, entité, ID, utilisateur, changements (avant/après)
- Accessible uniquement aux administrateurs

### 4. Administration
- Gestion des utilisateurs (création, modification, rôles, activation)
- Interface EasyAdmin pour l'administration back-office

---

## 🐔 Module 1 — Suivi des techniciens d'élevage (Fermes)

### Rôle : Technicien d'élevage (ROLE_TECHNICIAN)
Le technicien est un **expert zootechnique**. Il visite les **fermes** pour conseiller les éleveurs sur la santé, la nutrition et la conduite d'élevage.

### Gestion des visites en ferme
- Planification de visites chez les éleveurs
- Démarrage de visite (date/heure, coordonnées GPS)
- Objectif de visite
- Clôture de visite (verrouillage)
- Fenêtre d'édition de **48 heures**
- Archivage logique (activation/désactivation)

### Observations par bande d'animaux
- Une observation par bande et par visite (contrainte d'unicité)
- **Préoccupations** du client, **commentaires d'observation**, **recommandations**
- **Données spécifiques à l'espèce** en JSON flexible : poids, mortalité, aliment, densité, inventaire
- **Photos** des observations
- **Problèmes détectés** (sévérité : faible/moyenne/élevée) et **problèmes résolus**
- Comparaison aux **standards de croissance** (benchmark)
- **Réclamations techniques** : anomalies de poids, alertes mortalité, problèmes sanitaires → traitées par le technicien

### Gestion des clients éleveurs
- Fiche client : nom, zone, localisation, code ERP
- **Bâtiments** : nom, surface, capacité maximale
- **Spéculations** (types d'élevage) : poulet de chair, poisson, porc, etc.
- Assignation des clients à un technicien (**portefeuille**)
- Historique des affectations (PortfolioHistory)

### Gestion des bandes (lots d'animaux)
- Création de bandes dans les bâtiments
- Nombre de sujets, dates début/fin
- **Standard de croissance** associé (courbe de référence)
- **Stratégie et formule d'alimentation** avec historique des changements
- Clôture de bande

### Prophylaxie (suivi sanitaire)
- Calendrier de vaccination et traitements par spéculation
- Tâches planifiées par jour cible (ex : Gumboro J7, J14)
- Types : VACCIN, VITAMINE, etc.

### Prospection et consultation technique
- **Prospection** : démarchage de nouveaux éleveurs (détails ferme, intervention, RDV)
- **Consultation** : visites de conseil technique (même structure)

### KPIs Technicien
| KPI | Description |
|-----|-------------|
| **Visites planifiées vs réalisées** | Productivité terrain |
| **Taux de réalisation** | Visites réalisées / planifiées |
| **Adhérence au planning** | Visites faites le jour J prévu |
| **Complétion des objectifs** | Réalisé vs objectif quotidien |

### Exports
- Export Excel (PhpSpreadsheet) : performances des techniciens
- Export PDF (jsPDF) et image (html-to-image) depuis le dashboard

---

## 🏪 Module 2 — Suivi des commerciaux en provenderie (en production ✅)

### Statut : Toutes les fonctionnalités principales sont implémentées (Étapes 6-15 ✅)

### Sécurité (Audit ✅)
- Toutes les entités commerciales ont des attributs `security:` sur leurs opérations API Platform
- Les contrôleurs de workflow commandes vérifient l'assignation du commercial
- Les pages frontend vérifient `ROLE_SALES_REP` avant d'afficher le contenu
- Les votants garantissent la séparation des rôles technicien vs commercial
- Le module technicien est protégé contre les accès commerciaux (et vice-versa)

### Rôle : Commercial (ROLE_SALES_REP)
Le commercial est un **vendeur**, sans expertise technique en élevage. Il visite les **provenderies** (points de vente d'aliments pour animaux) pour développer les ventes, contrôler la présence de la marque et prendre les commandes. **Il ne fait pas de conseil technique** — les réclamations techniques sont escaladées aux techniciens.

### Gestion des visites en provenderie
- Planification de tournées de visites chez les provenderies
- Check-in GPS à l'arrivée
- Saisie des activités réalisées durant la visite
- Clôture de visite avec rapport

### Saisie des données terrain (Étape 9 ✅)
Lors de la visite, le commercial peut enregistrer toutes les données commerciales via des formulaires intégrés à la page détail :

| Audit | Type | Données saisies |
|-------|------|-----------------|
| **Prix** | Multi (0..N) | Produit, prix attendu/observé, 3 concurrents, promo, conformité ±5% |
| **Stock** | Multi (0..N) | Produit, quantité, rupture, FIFO, fraîcheur (1-5), emballage |
| **Qualité** | Unique (0..1) | Sacs endommagés, stockage (palettes/sec/protégé), nuisibles, moisissures, propreté |
| **Visibilité** | Unique (0..1) | Affiches, banderoles, calendriers, sacs brandés, enseigne, goodies, part visibilité |
| **Commandes** | Multi (0..N) | Produit, quantité, prix unitaire, statut (précommande/confirmée/livrée/annulée) |
| **Photos** | Multi (0..N) | Upload base64 compressé, catégorisé (général/prix/stock/qualité/visibilité) |

Tous les formulaires supportent : création, modification, suppression, mode offline (file d'attente SyncProvider), et verrouillage après clôture de visite.

### Workflow de visite (Étape 10 ✅)
- Bouton « 🚀 Démarrer la visite » sur la page détail et la liste (check-in GPS)
- Endpoint dédié `PATCH /sales-visits/{id}/start` avec validation (non archivé, non clôturé, pas déjà démarré)
- Transition automatique planifiée → en cours

### Affichage des photos (Étape 11 ✅)
- Miniatures réelles avec lazy loading
- Lightbox plein écran au clic
- Suppression par photo (bouton × au survol)

### Dashboard principal enrichi (Étape 12 ✅)
- Mini-KPIs commerciaux affichés dans le dashboard principal pour les commerciaux
- Navigation adaptative selon le rôle (technicien vs commercial)
- Chargement des stats `/stats/sales` intégré au dashboard

### Rapports commerciaux (Étape 13 ✅)
- Rapport « Performance Commerciale » basé sur `/stats/sales` (données réelles)
- Graphiques Recharts : KPIs visites, prix/stock, qualité/visibilité, entonnoir de conversion
- Exports Excel et PDF fonctionnels

### Workflow commandes (Étape 14 ✅)
- 3 endpoints dédiés : `PATCH /pre-orders/{id}/confirm`, `/deliver`, `/cancel`
- Validation des transitions d'état (PREORDER → CONFIRMED → DELIVERED, ou annulation)
- Boutons contextuels dans le détail visite : Confirmer, Livrer, Annuler

### Perfect Store Score (Étape 15 ✅)
- Score composite /100 calculé dans le backend (SalesStatsProvider)
- Pondération : Prix (25%) + Stock (20%) + Qualité (15%) + Visibilité (15%) + Exécution (15%) + Fraîcheur (10%)
- Affichage proéminent dans le dashboard commercial (carte dédiée avec code couleur)

### Activités de la visite commerciale
Chaque visite donne lieu à une check-list d'activités qui alimentent les KPIs :

1. **Vérification stock** — niveaux, dates de péremption, rotation FIFO
2. **Contrôle qualité** — état des sacs, conditions de stockage, présence de nuisibles
3. **Relevé des prix** — nos prix, prix concurrence, conformité prix recommandé
4. **Prise de commande** — précommande, commande ferme
5. **Vérification merchandising** — affichage, PLV, planogramme
6. **Échange avec le gérant** — objections, besoins, remontées
7. **Photos** — façade, linéaire, stock, affichage

### KPIs Commercial

#### JP Adherence (Adhérence au Plan de Tournée)
- % de visites réalisées le jour prévu
- Écart GPS entre position réelle et adresse du point de vente
- Temps passé vs durée planifiée
- Score pondéré par la distance parcourue (zone rurale = longs trajets)

#### Call Rate (Taux de Visite)
- Nombre de visites réalisées / visites planifiées (jour, semaine, mois)
- Par segment de client (top 20, moyens, petits)
- Taux de conformité à la fréquence contractuelle

#### Strike Rate (Taux de Conversion)
- **Preorder Rate** : nombre de précommandes prises / visites avec opportunité
- **Winning Preorder** : commandes livrées / précommandes prises
- Panier moyen par visite (en tonnes et en valeur)
- Strike rate par type d'aliment (démarrage, croissance, finition)
- Analyse des pertes : prix, dispo, crédit, concurrence

#### Visibility (Visibilité Marque)
- **POSM** : présence et état des affiches, banderoles, calendriers
- **Façade** : enseigne visible, signalétique
- **Branding** : tenues, casquettes, tabliers aux couleurs de la marque
- **Ratio vs concurrence** : part de visibilité sur le point de vente
- **Sacs** : branding visible sur les stocks d'aliments exposés
- Score photo à l'appui

#### Price (Prix — RRP et Audit Prix)
- **RRP Compliance** : % de produits au prix recommandé
- Écart moyen entre prix relevé et prix recommandé
- Relevé des prix des 3 principaux concurrents
- Vérification des prix promotionnels
- Prix au kg (et non au sac, car le grammage varie)

#### Assortment (Assortiment)
- **Must Stock** : % de SKUs obligatoires présents
- Taux de référencement des nouveaux produits
- SKUs absents (ruptures)
- Part de gamme vs concurrence
- Respect du planogramme
- Assortiment pondéré par le potentiel de la zone

#### Quality (Qualité Produit en Magasin)
- **Fraîcheur** : score basé sur la date de fabrication restante (≤ 60j pour l'aliment)
- **Avaries** : % de sacs endommagés, troués, mouillés
- **Stockage** : sur palettes, à l'abri de l'humidité
- **Hygiène** : absence de rongeurs, insectes (charançons), moisissures
- **Granulométrie** : contrôle visuel du taux de fines
- Score qualité avec photo

#### Activation (Exécution Promotionnelle)
- Taux d'exécution des promotions planifiées (affiche en place, prix appliqué, stock dispo)
- Lancements nouveaux produits (PLV, échantillons)
- Campagnes saisonnières activées
- Participation aux foires/marchés à bétail

#### Execution (Score d'Exécution Global)
- **Perfect Store Score** : note composite de tous les KPIs ci-dessus (/100)
- Taux de complétion des tâches de la check-list visite
- Objections traitées et résolues
- Suivi des points soulevés lors de la visite précédente
- Qualité du rapport de visite (champs remplis, photos prises)

#### Suivi des Stocks
| Indicateur | Définition |
|------------|------------|
| **DN (Distribution Numérique)** | % de points de vente référençant le produit |
| **DV (Distribution Valeur)** | DN pondérée par le volume du point de vente |
| **Part de Stock** | Volume de nos produits / volume total catégorie |
| **Pénétration** | % de magasins ayant acheté le produit sur la période |
| **OOS (Out of Stock)** | % de magasins en rupture sur un SKU lors de la visite |
| **Rotation** | Délai entre livraison et vente complète |
| **Couverture** | Jours de stock disponibles |
| **FIFO** | Respect du First In First Out |

### Réclamations
- Les réclamations **commerciales** (prix, facturation, livraison, avoirs) sont traitées par le **commercial**
- Les réclamations **techniques** (qualité aliment, impact sur la santé animale, mortalité suspecte) sont **escaladées au technicien** via le système de tickets

### KPIs additionnels proposés pour le module commercial

#### Performance Commerciale
- **CA par visite** et **CA par km parcouru** (rentabilité de tournée)
- **Taux de cross-selling** : aliment + compléments + services
- **Part du portefeuille** : notre part dans les achats totaux d'aliment du client
- **Croissance du compte** : évolution du volume acheté sur 3, 6, 12 mois

#### Engagement Client
- **NPS** (Net Promoter Score) mesuré trimestriellement
- Taux de réclamation résolu sous 48h
- Taux de réachat (fidélité)

#### Efficacité Tournée
- Nombre de visites par jour de tournée
- Kilomètres parcourus par visite
- Temps de conduite vs temps face au client
- Coût de la tournée / CA généré

---

## 👥 Rôles utilisateurs

| Rôle | Périmètre | Permissions |
|------|-----------|------------|
| **Technicien** (ROLE_TECHNICIAN) | Fermes | Gère ses visites et observations (fenêtre 48h), conseil technique, réclamations techniques, stats |
| **Commercial** (ROLE_SALES_REP) | Provenderies | Gère ses visites commerciales, relevés prix/stock/qualité, prises de commande, réclamations commerciales |
| **Admin** (ROLE_ADMIN) | Global | Gère utilisateurs, bâtiments, standards, accès aux logs d'audit |
| **Super Admin** (ROLE_SUPER_ADMIN) | Global | Suppression d'entités, impersonation |

---

## 📊 Modèle de données

### Entité Customer — client unifié

Un même client peut être **à la fois** éleveur (visité par les techniciens) et gérant de provenderie (visité par les commerciaux). Le champ `type` permet de filtrer sans exclure :

```
Customer.type ∈ { 'FARM', 'FEED_STORE', 'BOTH', null }
```

Les champs `buildings` et `speculations` sont utilisés côté ferme ; ils sont simplement vides pour une provenderie pure.

### Module Technicien (19 entités, dont Customer modifié)

```
User ──┬── Visit ──── Observation ──┬── Problem (detectedIn)
       │          (plannedAt,        ├── Problem (resolvedIn)
       │           completedAt,      ├── ObservationPhoto
       │           planningDeviation)│── FlockFeedHistory
       ├── UserObjective
       ├── PortfolioHistory
       ├── Prospection
       └── Consultation

Customer ──┬── Building ──── Flock ──┬── Observation
 (type)    │                         ├── FlockFeedHistory
           │                         ├── Standard
           │                         └── Ticket
           ├── Speculation (ManyToMany)
           ├── Prospection
           ├── Consultation
           └── PortfolioHistory

Speculation ──┬── Standard
              ├── ProphylaxisTask
              ├── Flock
              └── Customer (ManyToMany)

AuditLog (indépendant, immuable)
```

**Ajouts récents sur Visit** : `plannedAt`, `completedAt` + getter calculé `getPlanningDeviation()` pour supporter les KPIs JP Adherence et Call Rate des techniciens.

### Module Commercial (8 nouvelles entités)

```
User (ROLE_SALES_REP)
  │
  └── SalesVisit ──────┬── PriceAudit (0..N)       — relevé prix par produit
                        ├── StockAudit (0..N)        — état du stock par produit
                        ├── QualityAudit (0..1)      — évaluation qualité globale
                        ├── VisibilityAudit (0..1)   — évaluation visibilité globale
                        ├── PreOrder (0..N)          — précommandes prises
                        ├── SalesActivity (0..N)     — check-list des tâches
                        └── SalesPhoto (0..N)        — photos catégorisées

Customer ──┬── SalesVisit
 (type)    └── PreOrder
```

| Entité | Rôle | KPIs alimentés |
|--------|------|---------------|
| `SalesVisit` | Visite commerciale en provenderie | JP Adherence, Call Rate |
| `PriceAudit` | Relevé prix (nous + 3 concurrents) | RRP Compliance, écart prix |
| `StockAudit` | Niveau de stock, FIFO, fraîcheur | Assortment, OOS, DN/DV, FIFO |
| `QualityAudit` | État des sacs, stockage, hygiène | Quality Score, taux d'avaries |
| `VisibilityAudit` | POSM, affiches, branding, façade | Visibility Score, ratio concurrence |
| `PreOrder` | Précommande → confirmée → livrée | Strike Rate, panier moyen, CA |
| `SalesActivity` | Tâche de la check-list visite | Execution, Activation |
| `SalesPhoto` | Photo catégorisée (prix/stock/qualité/visibilité) | Preuves pour tous les audits |

---

## 🔒 Règles métier clés

### Module Technicien
1. **Fenêtre d'édition de 48h** : modification visite/observation limitée à 48h
2. **Visite clôturée = verrouillée**
3. **Visite archivée** (`activated=false`) : invisible pour le technicien
4. **Unicité observation** : une par bande et par visite
5. **Assignation technicien** : seul le technicien assigné peut créer/modifier ses observations
6. **Réclamations techniques** : gérées exclusivement par les techniciens

### Module Commercial
1. **Pas de conseil technique** : le commercial ne donne aucun avis sur la santé animale ou la nutrition
2. **Escalade des réclamations techniques** : toute réclamation sur la qualité de l'aliment impactant la santé animale est remontée au technicien via ticket
3. **Check-in GPS obligatoire** : validation de la présence au point de vente
4. **Photo obligatoire** : chaque activité d'audit (prix, stock, qualité, visibilité) doit être documentée par une photo
5. **Precommande vs commande ferme** : distinction claire entre intention et commande validée
