# FleetControl

FleetControl is an enterprise SaaS foundation for fleet management companies, logistics operators, carriers, and contract-driven operations.

The current phase intentionally focuses on the production base: architecture, project structure, design system readiness, security primitives, environment setup, quality gates, and documentation. Operational modules such as vehicles, drivers, finance, contracts, tires, workshops, fueling, checklists, and reports are intentionally deferred.

## Architecture

The repository uses npm workspaces:

- `apps/web`: Next.js App Router frontend.
- `apps/api`: NestJS backend API.
- `packages/database`: Prisma schema and database infrastructure.
- `packages/authz`: RBAC permissions, roles, and permission helpers shared across apps.
- `packages/config`: typed environment helpers shared across apps.

## Principles

- Clean Architecture boundaries in backend modules.
- Feature modules instead of technical dumping grounds.
- Reusable UI primitives aligned with the Stitch design reference.
- Strict TypeScript.
- JWT access tokens plus refresh-token infrastructure.
- RBAC designed centrally and reused by API and UI.
- PostgreSQL as the source of truth.
- Redis prepared for cache and rate limiting.
- Docker for local infrastructure.
- CI prepared for formatting, linting, type checking, and builds.

## Getting Started

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev:web
npm run dev:api
```

Frontend: `http://localhost:3000`

API: `http://localhost:4000/api`

Swagger: `http://localhost:4000/docs`

## Deploy

The Vercel deployment guide lives in `docs/vercel.md`.

Preview deployments are generated from GitHub pull requests. Production deployment should track the main branch.

## Design Source of Truth

The Google Stitch export is the official UX/UI reference. This codebase is prepared to preserve that identity through Tailwind tokens, shadcn-compatible primitives, theme variables, layout shells, and reusable components.

If a Stitch export is added later, place it under `docs/stitch/` and map its tokens into:

- `apps/web/src/app/globals.css`
- `apps/web/tailwind.config.ts`
- `apps/web/src/lib/design-tokens.ts`

Do not redesign screens. Implement missing UI by extending the same system.

## Quality Gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
```

## Environment

Use `.env.example` as the contract for required runtime values. Never commit real secrets.

On Windows environments that rely on the operating system certificate store, run npm commands with:

```bash
set NODE_OPTIONS=--use-system-ca
```

## Current Scope

Implemented in this phase:

- Monorepo foundation.
- Next.js frontend shell.
- NestJS API shell.
- Prisma schema with multi-tenant SaaS core.
- Complete authentication foundation with JWT, refresh-token sessions, secure cookies, reset password, remote session revocation, and brute-force protection.
- RBAC and ABAC primitives.
- Company, branch, department, team, position, and user SaaS structures.
- Audit logs, event outbox, notification center, settings, feature flags, Redis cache, and storage provider abstraction.
- Versioned Prisma migration and idempotent bootstrap seed for the first Global Administrator.
- Fleet vehicle lifecycle, dashboards, documents, photos, cost visibility, archived records, and
  user-owned saved filter views.
- Driver lifecycle, CNH and occupational expiry alerts, vehicle assignment history, documents,
  dashboards, and tenant-safe operational workflows.
- Contract and public-bid lifecycle, addenda, expiry alerts, financial utilization, documents, and
  historical vehicle allocation.
- SMTP mail provider for password reset and email notifications.
- Theme provider and light/dark mode.
- Core reusable UI components.
- Docker Compose for PostgreSQL and Redis.
- ESLint, Prettier, Husky, lint-staged, Commitlint.
- CI workflow.

Still deferred:

- Finance.
- Tires.
- Workshops.
- Auto parts.
- Fueling.
- Checklists.
- Reports.
