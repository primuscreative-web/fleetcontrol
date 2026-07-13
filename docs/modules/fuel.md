# Fuel

The Fuel module controls stations, price history and fuelings as an approval workflow, isolated by company and branch.

## Workflow

1. Purchasing or management registers a station and effective fuel prices.
2. Operations records odometer, volume, unit price, invoice and optional driver evidence.
3. The service detects odometer rollback, total mismatch, price deviation and incompatible fuel type.
4. An approver accepts or rejects the pending record. Only approval updates vehicle mileage, monthly fuel costs and the vehicle timeline.

Anomalies remain visible in the operational dashboard and emit an internal high-priority notification. Creation, approval, rejection, station and price changes are tenant-scoped and auditable. Domain events are written through the existing event bus.

## API

- `GET /fuel`, `GET /fuel/dashboard`, `GET /fuel/options`
- `POST /fuel`, `PATCH /fuel/:id/approve`, `PATCH /fuel/:id/reject`
- `GET /fuel/stations`, `POST /fuel/stations`, `POST /fuel/stations/:id/prices`

Permissions are split into `fuel:read`, `fuel:manage`, `fuel:approve`, `fuel:stations` and `fuel:import`. Imports and card/GPS integrations can use `externalId` for idempotency and the prepared source enum.

## Operations

Apply migration `20260713230000_fuel_module` before deployment. Station prices are effective-dated; do not overwrite historical rows. Receipt files must be uploaded with the existing storage provider and only their safe storage key/URL persisted.
