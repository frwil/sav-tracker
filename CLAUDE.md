# CLAUDE.md

## Project Overview

**SAV Tracker** is a comprehensive Progressive Web Application (PWA) for tracking livestock technicians' farm visits, observations, and performance. Built for agricultural/livestock operations (poultry, fish, pigs), it enables offline-first field data collection with automatic synchronization.

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
│   ├── Entity/          # Doctrine entities (18 entities)
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
│   ├── src/components/  # Reusable components (visit, observation, prospection)
│   ├── src/hooks/       # Custom React hooks (auth, visits, customers, etc.)
│   ├── src/services/    # API client and offline storage services
│   ├── src/providers/   # React context providers
│   └── src/types/       # TypeScript type definitions
├── config/              # Symfony configuration (packages, routes, services)
├── migrations/          # Doctrine database migrations
├── templates/           # Twig templates (admin)
├── translations/        # Translation files
└── docker-compose files # Docker orchestration
```

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
- `ROLE_TECHNICIAN` — field technician (can manage their own visits/observations)
- `ROLE_ADMIN` — administrator (manage users, buildings, view audit logs)
- `ROLE_SUPER_ADMIN` — super admin (can delete entities, switch users)

## Key Design Decisions
- **Offline-first**: Technicians work in remote farms with poor connectivity; all core features work offline with background sync
- **Species-agnostic data model**: JSON `data` field on Observation stores species-specific metrics (weight for poultry, density for fish, etc.), avoiding per-species entity explosion
- **48-hour edit window**: Technicians can only edit visits/observations within 48 hours — enforced by voters
- **Soft archiving**: Entities use `activated=false` instead of hard deletion for audit trail integrity
- **Portfolio history**: Customer-technician assignments are tracked over time via PortfolioHistory
- **Dual event listeners**: Both EventListener/AuditSubscriber and EventSubscriber/AuditLogSubscriber exist — the EventSubscriber version (#[AsDoctrineListener]) is the active one
