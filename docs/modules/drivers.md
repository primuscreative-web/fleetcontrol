# Drivers module

Drivers manages the complete professional and operational lifecycle of a driver inside a company.
Records are isolated by `companyId` and optionally restricted by the authenticated principal's
branch and department.

## Capabilities

- Driver registration and editable profile with CPF, CNH, contact, employment, branch, and
  department data.
- CNH, medical exam, and toxicology expiry indicators with scheduled internal notifications.
- Status lifecycle for active, leave, suspension, inactive, and terminated drivers.
- Historical vehicle assignments. A new primary assignment atomically closes any active primary
  assignment for both the driver and vehicle.
- Driver documents with expiry alerts, storage metadata, timeline, audit logs, and outbox events.
- Soft archival that ends active assignments and removes the driver from operational listings.
- Dashboard, search, status filters, and server-side pagination.

## Security

All reads and writes require `drivers:*` permissions. Company scope is enforced in repository
writes and service lookups. Branch, department, linked user, and vehicle references are validated
against the same company. Operational roles can manage or assign drivers without receiving the
separate archival permission.

## API

- `GET/POST /drivers`
- `GET /drivers/dashboard`
- `GET /drivers/options`
- `GET/PATCH /drivers/:id`
- `PATCH /drivers/:id/status`
- `POST /drivers/:id/assignments`
- `PATCH /drivers/:id/assignments/:assignmentId/end`
- `POST /drivers/:id/documents`
- `POST /drivers/:id/archive`

## Verification

Repository tests cover tenant scope, organizational filters, identity search, pagination, and
tenant-safe updates. Service tests cover organizational concealment and the active-driver
assignment invariant. RBAC tests verify the separation between operational and archival access.
