# Contracts and public bids module

Contracts manages public bids and private agreements from draft through termination. Every record,
subresource, allocation, and write is scoped by company and optionally by branch.

## Capabilities

- Contract and bid identification, contracting authority, manager, term, guarantee, total value,
  consumed value, and renewal notice policy.
- Lifecycle statuses, expiry dashboard, contractual balance, utilization, and active fleet counts.
- Addenda that atomically adjust contract value and/or end date while preserving previous terms.
- Historical vehicle allocation. A new allocation closes an existing active allocation and updates
  the Fleet relationship in the same transaction.
- Documents with storage metadata and scheduled expiry alerts.
- Timeline, audit records, outbox events, notifications, soft archival, filters, and pagination.

## Security and migration

RBAC separates read, management, addenda, vehicle allocation, documents, and archival. Repository
writes and service references enforce `companyId`. The migration converts the existing optional
`Vehicle.contractId` field into a foreign key. Any legacy free-text reference is copied into the
vehicle observations before the field is cleared, preventing silent information loss.

## API

- `GET/POST /contracts`
- `GET /contracts/dashboard`
- `GET /contracts/options`
- `GET/PATCH /contracts/:id`
- `PATCH /contracts/:id/status`
- `POST /contracts/:id/amendments`
- `POST /contracts/:id/allocations`
- `PATCH /contracts/:id/allocations/:allocationId/release`
- `POST /contracts/:id/documents`
- `POST /contracts/:id/archive`

## Verification

Repository tests cover tenant scope, search, pagination, and tenant-safe updates. Service tests
cover branch concealment and the active-contract allocation invariant. RBAC tests cover operational,
financial, and archival separation.
