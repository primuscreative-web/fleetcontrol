# Tires

Tires manages each tire as a serialized safety and cost asset throughout purchase, installation, rotation, inspection, retread and disposal.

## Invariants

- A vehicle position can contain only one active tire.
- Condemned tires cannot be installed and installed tires cannot be scrapped or sent to retread.
- Removal mileage cannot precede installation mileage; accumulated distance only increases.
- Retreads cannot exceed the tire's configured limit.
- Inspection condition is derived from groove measurements, minimum tread, irregular wear and damage findings.
- Purchase cost is allocated to the vehicle only on the tire's first installation, avoiding duplicate fleet costs after rotations or transfers.

Safety findings classified as critical or condemned create high-priority internal notifications. All material transitions create audit records and domain events; installation and removal also update the vehicle timeline.

## API

- Inventory: `GET/POST /tires`, `GET /tires/:id`
- Operational views: `GET /tires/dashboard`, `GET /tires/options`
- Position lifecycle: `PATCH /tires/:id/install|remove|rotate`
- Inspections: `POST /tires/:id/inspections`
- Retreads: `POST /tires/:id/retreads`, `PATCH /tires/:id/retreads/:retreadId/complete`
- Disposal: `PATCH /tires/:id/scrap`

Permissions are split into `tires:read`, `tires:manage`, `tires:move`, `tires:inspect`, `tires:retread` and `tires:scrap`.

## Deployment

Apply migration `20260714030000_tires_module`. Inspection photos use the existing storage provider; persist only safe storage keys and URLs. Provider names remain textual until the Suppliers and Workshops bounded contexts are delivered, allowing those future relations to be introduced without changing tire history.
