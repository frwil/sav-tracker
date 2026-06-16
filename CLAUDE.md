# CLAUDE.md

## Project Overview

**SAV Tracker** is a comprehensive Progressive Web Application (PWA) for tracking field teams in the livestock industry. It covers two distinct domains:

1. **Suivi des techniciens d'élevage** (existing) — technical advisors visiting **farms** to monitor animal flocks, health, and performance
2. **Suivi des commerciaux en provenderie** (in development) — sales representatives visiting **feed mills / feed stores** to monitor commercial KPIs

Both modules share the same offline-first PWA architecture for use in rural areas with poor connectivity.

## Maintenance Rules

> 1. **Après chaque modification du code (entités, contrôleurs, fonctionnalités), mettre à jour `summary.md` pour refléter les changements.** Le fichier `summary.md` doit toujours être le reflet exact des fonctionnalités actuellement implémentées.
> 2. **Après chaque validation de plan d'implémentation, sauvegarder le plan** dans un fichier `plans/étape-N.md` (ex: `plans/étape-9.md`) pour conserver la trace de ce qui a été convenu.

## Tech Stack

### Backend (Symfony)
- **Framework**: Symfony 8.0 (PHP 8.4+)
- **API**: API Platform 4.2 with OpenAPI support
- **ORM**: Doctrine ORM 3.6 with PostgreSQL
- **Auth**: JWT (LexikJWTAuthenticationBundle 3.2)
- **Admin**: EasyAdmin Bundle
- **Exports**: PhpSpreadsheet (Excel)
- **Infrastructure**: Docker, FrankenPHP + Caddy, Redis/Messenger
- **Dev**: Maker Bundle, Fixtures Bundle, Web Profiler

### Frontend (PWA - `pwa/`)
- **Framework**: Next.js 16 with React 19 (App Router)
- **Styling**: Tailwind CSS 4
- **State/Data**: TanStack React Query 5 with offline persistence
- **Storage**: localforage (IndexedDB), localStorage with TTL
- **Charts**: Recharts 3.7
- **Exports**: ExcelJS, jsPDF, html-to-image
- **PWA**: @ducanh2912/next-pwa 10

## Project Structure

```
├── src/
│   ├── Entity/          # Doctrine entities
│   ├── Repository/      # Custom Doctrine repositories
│   ├── Controller/      # Custom API controllers
│   ├── State/           # API Platform state processors/providers
│   ├── Security/Voter/  # Access control voters
│   ├── EventListener/   # Doctrine and Symfony event listeners
│   ├── EventSubscriber/ # Doctrine event subscribers
│   ├── EntityListener/  # Entity lifecycle listeners
│   ├── Validator/       # Custom validation constraints
│   ├── ApiResource/     # Non-entity API resources (e.g., TechnicianStats)
│   └── ApiPlatform/     # API Platform configuration/extensions
├── pwa/
│   ├── src/app/         # Next.js pages (login, dashboard, settings)
│   ├── src/components/  # Reusable components
│   ├── src/hooks/       # Custom React hooks
│   ├── src/services/    # API client and offline storage services
│   ├── src/providers/   # React context providers
│   └── src/types/       # TypeScript type definitions
├── config/              # Symfony configuration (packages, routes, services)
├── migrations/          # Doctrine database migrations
└── docker-compose files # Docker orchestration
```

## Domain Context

### Module 1 — Techniciens d'élevage (Farm Technicians)
- **Who**: Veterinary/animal husbandry technicians with technical expertise in livestock
- **Where**: They visit **farms** (fermes/élevages) directly
- **What they do**: Monitor animal health, growth curves, mortality, feed consumption, vaccination schedules, detect and resolve health problems
- **Expertise**: Technical (zootechnics, animal health, nutrition science)
- **Key entities**: Visit, Observation, Flock, Building, Problem, Standard, ProphylaxisTask

### Module 2 — Commerciaux en provenderie (Sales Representatives)
- **Who**: Sales representatives with commercial expertise only
- **Where**: They visit **provenderies** (feed mills / feed stores / points of sale)
- **What they do**: Monitor brand visibility, pricing compliance, product assortment, stock levels, promotional execution, take orders
- **Expertise**: Purely commercial (sales, merchandising, negotiation) — **no technical animal husbandry skills**
- **Key entities (to be built)**: SalesVisit, SalesActivity, PriceAudit, StockAudit, etc.

## Key Conventions

### Entity Design
- All entities use PHP 8 attributes for ORM and API Platform configuration
- Serialization groups control JSON output: `{entity}:read`, `{entity}:write`
- Soft-delete pattern via `activated` boolean flag on key entities
- JSON fields for flexible species-specific data (e.g., Observation `data`, Standard `curveData`)
- Auto-timestamping via `#[ORM\PrePersist]` and `#[ORM\HasLifecycleCallbacks]`

### API Design
- RESTful API with JSON-LD format via API Platform
- Custom operations use dedicated controllers (e.g., `/visits/{id}/close`, `/flocks/{id}/close`)
- Custom State Providers for non-entity resources (TechnicianStats) and complex queries (Visit, Customer)
- Voters enforce: admin/superadmin override, ownership checks, visit state checks (not closed, not archived), 48h time window

### Frontend Patterns
- Client components only (`'use client'`) — offline-first requires browser APIs
- Custom hooks encapsulate data fetching with cache-first strategy
- localStorage cache with TTL registry for cleanup
- IndexedDB (localforage) for React Query persistence and sync queue
- Offline mode: cache reads first, background API refresh, queued writes

### Naming
- French for domain entities and UI labels (the app targets French-speaking users)
- English for code structure (methods, variables, comments)
- Entities in French: Visite, Bande (Flock), Bâtiment (Building), Élevage (Speculation), Client (Customer)

## Common Commands

```bash
# Backend
docker compose up --wait          # Start all services
docker compose down               # Stop services
php bin/console make:entity       # Generate entity
php bin/console make:migration    # Generate migration
php bin/console doctrine:migrations:migrate  # Run migrations
php bin/console debug:router      # List routes

# Frontend
cd pwa && npm run dev             # Start Next.js dev server (Turbopack)
cd pwa && npm run build           # Build for production
```

## Role Hierarchy
- `ROLE_USER` — base role (all authenticated users)
- `ROLE_TECHNICIAN` — field technician visiting farms (technical expertise)
- `ROLE_SALES_REP` — sales representative visiting provenderies (commercial expertise only)
- `ROLE_ADMIN` — administrator (manage users, buildings, view audit logs)
- `ROLE_SUPER_ADMIN` — super admin (can delete entities, switch users)

## Key Design Decisions
- **Offline-first**: Field agents work in remote areas with poor connectivity; all core features work offline with background sync
- **Species-agnostic data model**: JSON `data` field on Observation stores species-specific metrics (weight for poultry, density for fish, etc.), avoiding per-species entity explosion
- **48-hour edit window**: Technicians can only edit visits/observations within 48 hours — enforced by voters
- **Soft archiving**: Entities use `activated=false` instead of hard deletion for audit trail integrity
- **Portfolio history**: Customer-technician assignments are tracked over time via PortfolioHistory
- **Dual event listeners**: Both EventListener/AuditSubscriber and EventSubscriber/AuditLogSubscriber exist — the EventSubscriber version (#[AsDoctrineListener]) is the active one
- **Module separation**: Technician module (farms, technical) and Sales Rep module (provenderies, commercial) are distinct domains with different entities, KPIs, and access rules — they share only the authentication layer and common infrastructure
