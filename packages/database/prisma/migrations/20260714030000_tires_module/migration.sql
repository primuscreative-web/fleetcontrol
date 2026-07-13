CREATE TYPE "TireStatus" AS ENUM ('IN_STOCK','INSTALLED','IN_REPAIR','IN_RETREAD','SCRAPPED','LOST');
CREATE TYPE "TireCondition" AS ENUM ('NEW','GOOD','FAIR','CRITICAL','CONDEMNED');
CREATE TYPE "TireMovementType" AS ENUM ('PURCHASE','INSTALL','REMOVE','ROTATE','SEND_REPAIR','RETURN_REPAIR','RETREAD','TRANSFER','SCRAP','ADJUSTMENT');
CREATE TYPE "TireRetreadStatus" AS ENUM ('REQUESTED','SENT','IN_PROGRESS','COMPLETED','REJECTED','CANCELLED');

CREATE TABLE "Tire" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "branchId" TEXT, "currentVehicleId" TEXT,
 "serialNumber" TEXT NOT NULL, "fireNumber" TEXT, "brand" TEXT NOT NULL, "model" TEXT NOT NULL, "size" TEXT NOT NULL,
 "dot" TEXT, "loadIndex" TEXT, "speedIndex" TEXT, "manufacturerAt" TIMESTAMP(3), "purchasedAt" TIMESTAMP(3),
 "purchaseCost" DECIMAL(14,2), "supplierName" TEXT, "invoiceNumber" TEXT, "warrantyUntil" TIMESTAMP(3),
 "status" "TireStatus" NOT NULL DEFAULT 'IN_STOCK', "condition" "TireCondition" NOT NULL DEFAULT 'NEW',
 "currentPosition" TEXT, "installedAt" TIMESTAMP(3), "installedOdometer" DECIMAL(14,2),
 "accumulatedKm" DECIMAL(14,2) NOT NULL DEFAULT 0, "initialTreadDepthMm" DECIMAL(6,2),
 "currentTreadDepthMm" DECIMAL(6,2), "minimumTreadDepthMm" DECIMAL(6,2) NOT NULL DEFAULT 1.6,
 "recommendedPressurePsi" DECIMAL(6,2), "retreadCount" INTEGER NOT NULL DEFAULT 0,
 "maxRetreads" INTEGER NOT NULL DEFAULT 2, "totalLifecycleCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
 "scrappedAt" TIMESTAMP(3), "scrapReason" TEXT, "notes" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "archivedAt" TIMESTAMP(3),
 CONSTRAINT "Tire_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TireMovement" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "tireId" TEXT NOT NULL, "fromVehicleId" TEXT, "toVehicleId" TEXT,
 "createdById" TEXT, "type" "TireMovementType" NOT NULL, "fromPosition" TEXT, "toPosition" TEXT,
 "odometer" DECIMAL(14,2), "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reason" TEXT,
 "cost" DECIMAL(14,2) NOT NULL DEFAULT 0, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "TireMovement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TireInspection" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "tireId" TEXT NOT NULL, "vehicleId" TEXT, "createdById" TEXT,
 "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "odometer" DECIMAL(14,2), "pressurePsi" DECIMAL(6,2),
 "treadDepthInnerMm" DECIMAL(6,2), "treadDepthCenterMm" DECIMAL(6,2), "treadDepthOuterMm" DECIMAL(6,2),
 "averageTreadDepthMm" DECIMAL(6,2), "condition" "TireCondition" NOT NULL,
 "irregularWear" BOOLEAN NOT NULL DEFAULT false, "hasDamage" BOOLEAN NOT NULL DEFAULT false,
 "recommendedAction" TEXT, "photoStorageKey" TEXT, "photoUrl" TEXT, "notes" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TireInspection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TireRetread" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "tireId" TEXT NOT NULL, "createdById" TEXT,
 "status" "TireRetreadStatus" NOT NULL DEFAULT 'REQUESTED', "providerName" TEXT NOT NULL,
 "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "sentAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "costAllocatedAt" TIMESTAMP(3),
 "cost" DECIMAL(14,2) NOT NULL DEFAULT 0, "newTreadDepthMm" DECIMAL(6,2), "warrantyUntil" TIMESTAMP(3),
 "invoiceNumber" TEXT, "rejectionReason" TEXT, "notes" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "TireRetread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tire_companyId_serialNumber_key" ON "Tire"("companyId","serialNumber");
CREATE UNIQUE INDEX "Tire_currentVehicleId_currentPosition_key" ON "Tire"("currentVehicleId","currentPosition");
CREATE INDEX "Tire_companyId_status_condition_idx" ON "Tire"("companyId","status","condition");
CREATE INDEX "Tire_companyId_branchId_idx" ON "Tire"("companyId","branchId");
CREATE INDEX "Tire_companyId_warrantyUntil_idx" ON "Tire"("companyId","warrantyUntil");
CREATE INDEX "Tire_currentVehicleId_idx" ON "Tire"("currentVehicleId");
CREATE INDEX "Tire_archivedAt_idx" ON "Tire"("archivedAt");
CREATE INDEX "TireMovement_companyId_occurredAt_idx" ON "TireMovement"("companyId","occurredAt");
CREATE INDEX "TireMovement_tireId_occurredAt_idx" ON "TireMovement"("tireId","occurredAt");
CREATE INDEX "TireMovement_fromVehicleId_idx" ON "TireMovement"("fromVehicleId");
CREATE INDEX "TireMovement_toVehicleId_idx" ON "TireMovement"("toVehicleId");
CREATE INDEX "TireInspection_companyId_inspectedAt_idx" ON "TireInspection"("companyId","inspectedAt");
CREATE INDEX "TireInspection_tireId_inspectedAt_idx" ON "TireInspection"("tireId","inspectedAt");
CREATE INDEX "TireInspection_vehicleId_idx" ON "TireInspection"("vehicleId");
CREATE INDEX "TireRetread_companyId_status_idx" ON "TireRetread"("companyId","status");
CREATE INDEX "TireRetread_tireId_requestedAt_idx" ON "TireRetread"("tireId","requestedAt");

ALTER TABLE "Tire" ADD CONSTRAINT "Tire_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tire" ADD CONSTRAINT "Tire_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tire" ADD CONSTRAINT "Tire_currentVehicleId_fkey" FOREIGN KEY ("currentVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TireMovement" ADD CONSTRAINT "TireMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TireMovement" ADD CONSTRAINT "TireMovement_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "Tire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TireMovement" ADD CONSTRAINT "TireMovement_fromVehicleId_fkey" FOREIGN KEY ("fromVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TireMovement" ADD CONSTRAINT "TireMovement_toVehicleId_fkey" FOREIGN KEY ("toVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TireMovement" ADD CONSTRAINT "TireMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TireInspection" ADD CONSTRAINT "TireInspection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TireInspection" ADD CONSTRAINT "TireInspection_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "Tire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TireInspection" ADD CONSTRAINT "TireInspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TireInspection" ADD CONSTRAINT "TireInspection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TireRetread" ADD CONSTRAINT "TireRetread_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TireRetread" ADD CONSTRAINT "TireRetread_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "Tire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TireRetread" ADD CONSTRAINT "TireRetread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
