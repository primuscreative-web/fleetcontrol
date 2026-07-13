CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE', 'INSPECTION', 'CAMPAIGN');
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE "MaintenanceOrderStatus" AS ENUM ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "MaintenanceItemType" AS ENUM ('LABOR', 'PART', 'SERVICE', 'FEE');

CREATE TABLE "MaintenancePlan" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "description" TEXT, "type" "MaintenanceType" NOT NULL DEFAULT 'PREVENTIVE', "intervalDays" INTEGER,
  "intervalKm" DECIMAL(14,2), "lastPerformedAt" TIMESTAMP(3), "lastOdometer" DECIMAL(14,2),
  "nextDueAt" TIMESTAMP(3), "nextDueOdometer" DECIMAL(14,2), "alertDaysBefore" INTEGER NOT NULL DEFAULT 15,
  "alertKmBefore" DECIMAL(14,2), "estimatedCost" DECIMAL(14,2), "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3), CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MaintenanceOrder" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "branchId" TEXT, "vehicleId" TEXT NOT NULL, "planId" TEXT,
  "requestedById" TEXT, "approvedById" TEXT, "completedById" TEXT, "code" TEXT NOT NULL, "title" TEXT NOT NULL,
  "description" TEXT, "diagnosis" TEXT, "resolution" TEXT, "type" "MaintenanceType" NOT NULL,
  "priority" "MaintenancePriority" NOT NULL DEFAULT 'NORMAL', "status" "MaintenanceOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "previousVehicleStatus" "VehicleStatus",
  "odometer" DECIMAL(14,2) NOT NULL, "scheduledAt" TIMESTAMP(3), "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "downtimeStartedAt" TIMESTAMP(3), "downtimeEndedAt" TIMESTAMP(3), "estimatedCost" DECIMAL(14,2),
  "actualCost" DECIMAL(14,2) NOT NULL DEFAULT 0, "approvalNotes" TEXT, "rejectionReason" TEXT,
  "invoiceNumber" TEXT, "warrantyUntil" TIMESTAMP(3), "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3), CONSTRAINT "MaintenanceOrder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MaintenanceOrderItem" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "type" "MaintenanceItemType" NOT NULL,
  "description" TEXT NOT NULL, "sku" TEXT, "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
  "unitCost" DECIMAL(14,4) NOT NULL DEFAULT 0, "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenancePlan_companyId_vehicleId_name_key" ON "MaintenancePlan"("companyId", "vehicleId", "name");
CREATE INDEX "MaintenancePlan_companyId_nextDueAt_idx" ON "MaintenancePlan"("companyId", "nextDueAt");
CREATE INDEX "MaintenancePlan_companyId_active_idx" ON "MaintenancePlan"("companyId", "active");
CREATE INDEX "MaintenancePlan_vehicleId_nextDueOdometer_idx" ON "MaintenancePlan"("vehicleId", "nextDueOdometer");
CREATE UNIQUE INDEX "MaintenanceOrder_companyId_code_key" ON "MaintenanceOrder"("companyId", "code");
CREATE INDEX "MaintenanceOrder_companyId_status_priority_idx" ON "MaintenanceOrder"("companyId", "status", "priority");
CREATE INDEX "MaintenanceOrder_companyId_scheduledAt_idx" ON "MaintenanceOrder"("companyId", "scheduledAt");
CREATE INDEX "MaintenanceOrder_companyId_branchId_idx" ON "MaintenanceOrder"("companyId", "branchId");
CREATE INDEX "MaintenanceOrder_vehicleId_createdAt_idx" ON "MaintenanceOrder"("vehicleId", "createdAt");
CREATE INDEX "MaintenanceOrder_planId_idx" ON "MaintenanceOrder"("planId");
CREATE INDEX "MaintenanceOrderItem_companyId_type_idx" ON "MaintenanceOrderItem"("companyId", "type");
CREATE INDEX "MaintenanceOrderItem_orderId_idx" ON "MaintenanceOrderItem"("orderId");
CREATE INDEX "MaintenanceOrderItem_companyId_sku_idx" ON "MaintenanceOrderItem"("companyId", "sku");

ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceOrderItem" ADD CONSTRAINT "MaintenanceOrderItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceOrderItem" ADD CONSTRAINT "MaintenanceOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MaintenanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
