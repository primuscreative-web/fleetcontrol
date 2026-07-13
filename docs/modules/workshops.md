# Workshops

Workshops manages the approved service network, catalogs, competitive quotes and post-service performance while keeping supplier and parts inventory concerns in separate bounded contexts.

## Governance

- New workshops start in `PENDING_APPROVAL` and cannot quote until approved.
- Approval, rejection and suspension require dedicated permissions; suspension is blocked while active orders exist.
- Catalog entries define specialty, reference labor/fixed prices, expected hours and warranty.
- Each workshop can submit one quote per maintenance order. Item totals, labor, parts, discounts and final total are calculated server-side.
- Selecting a valid quote rejects competing proposals atomically and assigns workshop, estimate, schedule and warranty to the maintenance order.
- Only completed orders can be evaluated once. Ratings are recalculated from authoritative evaluations, avoiding concurrent-update drift.

Low evaluations create high-priority notifications. Homologation, proposals, selection and evaluation are audited and publish domain events. Maintenance completion increments the selected workshop's billed total.

## API

- Network: `GET/POST /workshops`, `GET /workshops/:id`
- Governance: `PATCH /workshops/:id/approve|reject|suspend`
- Catalog: `POST /workshops/:id/services`
- Quotes: `GET/POST /workshops/quotes`, `PATCH /workshops/quotes/:quoteId/select`
- Evaluation: `POST /workshops/:id/evaluations`
- Dashboard/options: `GET /workshops/dashboard`, `GET /workshops/options`

Permissions: `workshops:read`, `workshops:manage`, `workshops:approve`, `workshops:catalog`, `workshops:quotes`, `workshops:evaluate`.

## Deployment

Apply migration `20260714050000_workshops_module`. The module references existing maintenance orders and therefore must be deployed after `20260714010000_maintenance_module`.
