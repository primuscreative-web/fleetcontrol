# Fleet module

The Fleet module owns the vehicle master record and its operational lifecycle. Every query and
write is scoped by `companyId`; branch and department restrictions are additionally applied from
the authenticated principal.

## Capabilities

- Vehicle registration, update, status changes, organizational transfers, and soft archival.
- Catalogs for categories, subcategories, makes, models, versions, and cost centers.
- Search and filters by status, branch, department, category, make, model, plate, RENAVAM, and
  chassis.
- User-owned saved filter views, including a single default view per user and company.
- Vehicle photos, documents with expiry notifications, timeline, cost aggregates, audit trail,
  outbox events, and prepared cross-module relationships.
- Operational dashboard with availability, stoppage, maintenance, contract, document, age, and
  estimated-value indicators.

## Lifecycle guarantees

Archival is a soft operation. It sets `archivedAt`, moves the vehicle to `INACTIVE`, removes it
from active listings and dashboards, and records the reason in the timeline, audit log, event
outbox, and notification center. The API requires `fleet:archive`; the UI requests explicit
confirmation before submitting it.

Saved filters use the `fleet.vehicles` scope and the unique key `(companyId, userId, scope, name)`.
A user cannot read or delete another user's filter. When a new default is saved, other defaults in
the same user/company scope are cleared in the same transaction.

## API surface

- `GET/POST /fleet/vehicles`
- `GET /fleet/vehicles/dashboard`
- `GET /fleet/vehicles/options`
- `GET/POST/DELETE /fleet/vehicles/saved-filters[/:filterId]`
- `GET/PATCH /fleet/vehicles/:id`
- `PATCH /fleet/vehicles/:id/status`
- `POST /fleet/vehicles/:id/transfer`
- `POST /fleet/vehicles/:id/archive`
- Vehicle subresources: photos, documents, timeline, costs, audit, events, and relationships.

## Verification

Repository tests cover tenant scoping, pagination, search, and tenant-safe writes. Service tests
cover archival side effects, organizational access restrictions, default saved-filter behavior,
and saved-filter ownership.
