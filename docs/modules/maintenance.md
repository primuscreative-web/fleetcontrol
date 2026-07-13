# Maintenance

Maintenance manages preventive plans and controlled work orders without replacing the future Workshops, Inventory or Suppliers bounded contexts.

## Lifecycle

1. A plan defines recurrence by days, odometer or both, with independent alert thresholds.
2. An order is submitted with vehicle, mileage, priority, schedule, estimate and optional parts/services.
3. An authorized reviewer approves or rejects it. Approval places the vehicle in maintenance and records its timeline.
4. Operations starts the approved order, records diagnosis and completes it with resolution, invoice, warranty and cost items.
5. Completion recalculates actual cost, vehicle availability and odometer, monthly workshop cost, timeline and the linked plan's next due date/mileage.

The vehicle is only released when no other active maintenance order exists. Older orders never reduce its odometer. Critical submissions generate high-priority internal notifications.

## API and permissions

- Orders: `GET/POST /maintenance`, `GET /maintenance/:id`
- Workflow: `PATCH /maintenance/:id/approve|reject|start|complete`
- Planning: `GET/POST /maintenance/plans`
- Support: `GET /maintenance/dashboard`, `GET /maintenance/options`

Permissions: `maintenance:read`, `maintenance:manage`, `maintenance:approve`, `maintenance:plans`, `maintenance:complete`. Every query and mutation is company-scoped and branch-scoped where applicable; lifecycle changes emit audit records and domain events.

## Deployment

Apply migration `20260714010000_maintenance_module` before releasing the API. The dashboard calculates plan urgency from each plan's configured time and mileage thresholds. A scheduled notification worker can consume these same fields without changing the domain model.
