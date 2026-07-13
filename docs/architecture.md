# FleetControl Architecture

## Monorepo

FleetControl uses npm workspaces to keep product surfaces and shared packages in one repository without forcing an additional package manager on the local machine.

## Frontend

The frontend uses Next.js App Router, React, TypeScript, TailwindCSS, shadcn-compatible primitives, TanStack Query, TanStack Table, Recharts, Framer Motion readiness, and Lucide icons.

The UI is intentionally token-driven. Stitch remains the visual source of truth; colors, radius, effects, spacing, and component behavior should be mapped into tokens and reusable primitives instead of being duplicated screen by screen.

## Backend

The backend uses NestJS with feature modules and Clean Architecture boundaries:

- `domain`: entities, value objects, and business rules.
- `application`: use cases and orchestration.
- `infrastructure`: database, storage, external services.
- `presentation`: controllers, DTOs, and transport concerns.

## Database

Prisma models start with SaaS foundations:

- Companies.
- Branches.
- Departments.
- Teams.
- Positions.
- Users.
- Memberships.
- Refresh tokens.
- Audit logs.

Business modules will be added later without coupling them to authentication or tenancy internals.

## Security

Security foundations included in this phase:

- Strict environment validation.
- Helmet.
- CORS by configured app origin.
- Global DTO validation.
- Rate limiting.
- JWT access tokens.
- Opaque refresh-token sessions.
- Secure HTTP-only cookies.
- Remember Me session expiration.
- Password reset and authenticated password change flows.
- Brute-force login protection through Redis.
- Central RBAC package.
- ABAC company, branch, and department scope checks.
- Audit log model and HTTP mutation audit interceptor.

## Platform Infrastructure

This phase also includes production foundations for:

- Company, branch, department, team, position, and user structures.
- Role and permission persistence.
- Event outbox.
- Notification Center backend.
- Settings by system or company scope.
- Feature flags by system or company scope.
- Storage provider abstraction for local, S3, and Supabase.
- SMTP mail provider for authentication and notification delivery.
- Structured JSON logs prepared for OpenTelemetry, Sentry, Grafana, and Prometheus.
- Redis-backed cache for sessions, settings, feature flags, and login attempt protection.

## Database Lifecycle

The first migration is versioned under `packages/database/prisma/migrations`.

Runtime environments should apply migrations with `npm run db:deploy`. Local development can still use `npm run db:migrate`.

The bootstrap seed is idempotent. It synchronizes system roles and permissions, and only creates the first Global Administrator when all `BOOTSTRAP_*` variables are provided.

## Deferred Modules

Vehicles, drivers, finance, contracts, tires, workshops, auto parts, fueling, checklists, and reports are intentionally not implemented in this phase.
