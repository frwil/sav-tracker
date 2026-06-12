# SAV Tracker — Résumé des Fonctionnalités

## 🎯 Objectif de l'application

SAV Tracker est une **PWA (Progressive Web App) de suivi des techniciens d'élevage** dans les fermes. Elle permet aux techniciens de terrain d'enregistrer leurs visites, leurs observations sur les bandes d'animaux (volailles, poissons, porcs), et de suivre leurs performances — le tout en mode **offline-first** pour fonctionner même sans connexion réseau dans les zones rurales.

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

## 📱 Fonctionnalités principales

### 1. Authentification et mode offline
- Connexion par JWT (login/mot de passe)
- **Période de grâce offline de 7 jours** : un technicien peut continuer à travailler sans connexion
- Détection automatique de l'état réseau (online/offline)
- Cache utilisateur local avec expiration

### 2. Gestion des visites
- **Planification** de visites chez les clients/éleveurs
- **Démarrage** de visite (enregistre la date/heure de début)
- Saisie d'un **objectif de visite**
- **Coordonnées GPS** de la ferme
- **Clôture** de visite (verrouille les modifications)
- Fenêtre d'édition de **48 heures** après la visite (sécurité)
- **Archivage** logique (activation/désactivation)

### 3. Observations par bande d'animaux
- Saisie d'observations pour **chaque bande** (lot d'animaux) présente dans la ferme
- Champs structurés :
  - **Préoccupations** du client
  - **Commentaires d'observation** (analyse du technicien)
  - **Recommandations** au client
  - **Commentaire général**
- **Données spécifiques à l'espèce** (JSON flexible) :
  - Poids, mortalité, aliment, densité, inventaire, etc.
- **Photos** des observations (encodées en base64)
- **Problèmes détectés** (avec sévérité : faible/moyenne/élevée)
- **Problèmes résolus** (suivi de résolution)
- Contrainte d'unicité : une observation par bande et par visite

### 4. Gestion des clients et fermes
- Fiche client complète : nom, zone, localisation, code ERP
- **Bâtiments** : nom, surface, capacité maximale
- **Spéculations** (types d'élevage) : poulet de chair, poisson, porc, etc.
- Assignation des clients à un technicien (**portefeuille**)
- Historique des affectations (PortfolioHistory)

### 5. Gestion des bandes (lots d'animaux)
- Création de bandes dans les bâtiments
- Suivi : nom, nombre de sujets, dates début/fin
- Association à un **standard de croissance** (courbe de référence)
- **Stratégie et formule d'alimentation** avec historique des changements
- Clôture de bande (date de fin automatique)
- Archivage

### 6. Prospection et consultation
- **Prospection** : visites de démarchage chez de nouveaux clients potentiels
  - Détails de la ferme, préoccupations, attentes
  - Intervention réalisée ou non
  - Prise de rendez-vous
  - Statut : NOUVEAU, etc.
- **Consultation** : visites de conseil technique
  - Même structure que la prospection
  - Suivi des rendez-vous

### 7. Suivi sanitaire (prophylaxie)
- Calendrier de **vaccination** et traitements par spéculation
- Tâches planifiées par jour cible (ex : Gumboro à J7, J14)
- Types : VACCIN, VITAMINE, etc.

### 8. Système de tickets
- Signalement de problèmes : anomalie de poids, alerte mortalité, panne équipement, rupture d'approvisionnement
- Priorités : BASSE, MOYENNE, ÉLEVÉE, CRITIQUE
- Statuts : OUVERT, EN_COURS, RÉSOLU, FERMÉ
- Liens vers une bande et/ou une visite

### 9. Statistiques et performances
- **Tableau de bord** interactif avec graphiques (Recharts)
- Statistiques par technicien et par période :
  - Visites planifiées vs réalisées
  - Taux de réalisation
  - Adhérence au planning (ponctualité jour J)
  - Taux de complétion des objectifs
- **Objectifs quotidiens** paramétrables par technicien (UserObjective)
- Calcul automatique hors dimanches

### 10. Exports
- **Export Excel** (PhpSpreadsheet) : performances des techniciens
- **Export PDF** (jsPDF) : rapports depuis le dashboard
- **Export image** (html-to-image) : captures de graphiques

### 11. PWA — Fonctionnalités offline-first
- **Cache React Query** persistant dans IndexedDB → consultation des données sans réseau
- **File d'attente de synchronisation** → les modifications faites offline sont stockées et synchronisées au retour de connexion
- Cache localStorage avec **nettoyage automatique** (TTL de 30 jours pour les visites)
- Composant **CacheWarmer** pour précharger les données
- Monitoring de la **qualité réseau**
- Mode **partial data** : fallback sur les données de liste si le détail n'est pas en cache

### 12. Audit et traçabilité
- **Journal d'audit** automatique pour toutes les opérations CRUD
- Enregistre : action (CREATE/UPDATE/DELETE), entité, ID, utilisateur, changements
- Accessible uniquement aux administrateurs
- Changements stockés avec valeurs avant/après (hors mots de passe)

### 13. Administration
- Gestion des utilisateurs (création, modification, rôles, activation)
- Gestion des standards de croissance (courbes par espèce)
- Interface EasyAdmin pour l'administration back-office

---

## 👥 Rôles utilisateurs

| Rôle | Permissions |
|------|------------|
| **Technicien** (ROLE_TECHNICIAN) | Gère ses visites et observations (fenêtre 48h), consulte ses stats |
| **Admin** (ROLE_ADMIN) | Gère utilisateurs, bâtiments, standards, accès aux logs d'audit |
| **Super Admin** (ROLE_SUPER_ADMIN) | Suppression d'entités, impersonation |

---

## 📊 Modèle de données (18 entités)

```
User ──┬── Visit ──── Observation ──┬── Problem (detectedIn)
       │                            ├── Problem (resolvedIn)
       │                            ├── ObservationPhoto
       │                            └── FlockFeedHistory
       ├── UserObjective
       ├── PortfolioHistory
       ├── Prospection
       └── Consultation

Customer ──┬── Building ──── Flock ──┬── Observation
           │                         ├── FlockFeedHistory
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

---

## 🔒 Règles métier clés

1. **Fenêtre d'édition de 48h** : un technicien ne peut modifier une visite ou observation que dans les 48h suivant la visite
2. **Visite clôturée = verrouillée** : plus aucune modification possible
3. **Visite archivée** (`activated=false`) : invisible pour les techniciens, conservée pour l'historique
4. **Unicité observation** : une seule observation par bande et par visite
5. **Assignation technicien** : seul le technicien assigné peut créer/modifier des observations sur sa visite
6. **Objectifs hors dimanche** : le calcul des objectifs exclut les dimanches
7. **Suppression en cascade** : suppression d'une visite → suppression des observations liées
