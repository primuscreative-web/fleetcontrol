CREATE TYPE "FuelingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "FuelingSource" AS ENUM ('MANUAL', 'IMPORT', 'FUEL_CARD', 'INTEGRATION');

CREATE TABLE "FuelStation" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "branchId" TEXT, "name" TEXT NOT NULL,
  "legalName" TEXT, "document" TEXT, "code" TEXT, "address" TEXT, "city" TEXT, "state" TEXT,
  "latitude" DECIMAL(10,7), "longitude" DECIMAL(10,7), "active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "archivedAt" TIMESTAMP(3),
  CONSTRAINT "FuelStation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FuelPrice" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "stationId" TEXT NOT NULL,
  "fuelType" "VehicleFuelType" NOT NULL, "price" DECIMAL(12,4) NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3), "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FuelPrice_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Fueling" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "branchId" TEXT, "stationId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL, "driverId" TEXT, "fuelType" "VehicleFuelType" NOT NULL,
  "status" "FuelingStatus" NOT NULL DEFAULT 'PENDING', "source" "FuelingSource" NOT NULL DEFAULT 'MANUAL',
  "fueledAt" TIMESTAMP(3) NOT NULL, "odometer" DECIMAL(14,2) NOT NULL, "liters" DECIMAL(12,3) NOT NULL,
  "unitPrice" DECIMAL(12,4) NOT NULL, "totalAmount" DECIMAL(14,2) NOT NULL,
  "previousOdometer" DECIMAL(14,2), "distanceTraveled" DECIMAL(14,2), "consumptionKmPerL" DECIMAL(12,3),
  "fullTank" BOOLEAN NOT NULL DEFAULT true, "invoiceNumber" TEXT, "externalId" TEXT,
  "receiptStorageKey" TEXT, "receiptUrl" TEXT, "anomaly" BOOLEAN NOT NULL DEFAULT false,
  "anomalyReason" TEXT, "notes" TEXT, "createdById" TEXT, "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3), "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Fueling_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FuelStation_companyId_name_key" ON "FuelStation"("companyId", "name");
CREATE UNIQUE INDEX "FuelStation_companyId_code_key" ON "FuelStation"("companyId", "code");
CREATE INDEX "FuelStation_companyId_active_idx" ON "FuelStation"("companyId", "active");
CREATE INDEX "FuelStation_branchId_idx" ON "FuelStation"("branchId");
CREATE INDEX "FuelPrice_companyId_fuelType_effectiveAt_idx" ON "FuelPrice"("companyId", "fuelType", "effectiveAt");
CREATE INDEX "FuelPrice_stationId_fuelType_effectiveAt_idx" ON "FuelPrice"("stationId", "fuelType", "effectiveAt");
CREATE INDEX "FuelPrice_createdById_idx" ON "FuelPrice"("createdById");
CREATE UNIQUE INDEX "Fueling_companyId_externalId_key" ON "Fueling"("companyId", "externalId");
CREATE INDEX "Fueling_companyId_fueledAt_idx" ON "Fueling"("companyId", "fueledAt");
CREATE INDEX "Fueling_companyId_status_idx" ON "Fueling"("companyId", "status");
CREATE INDEX "Fueling_companyId_anomaly_idx" ON "Fueling"("companyId", "anomaly");
CREATE INDEX "Fueling_vehicleId_fueledAt_idx" ON "Fueling"("vehicleId", "fueledAt");
CREATE INDEX "Fueling_driverId_fueledAt_idx" ON "Fueling"("driverId", "fueledAt");
CREATE INDEX "Fueling_stationId_fueledAt_idx" ON "Fueling"("stationId", "fueledAt");
CREATE INDEX "Fueling_branchId_idx" ON "Fueling"("branchId");
CREATE INDEX "Fueling_createdById_idx" ON "Fueling"("createdById");
CREATE INDEX "Fueling_approvedById_idx" ON "Fueling"("approvedById");

ALTER TABLE "FuelStation" ADD CONSTRAINT "FuelStation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FuelStation" ADD CONSTRAINT "FuelStation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FuelPrice" ADD CONSTRAINT "FuelPrice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FuelPrice" ADD CONSTRAINT "FuelPrice_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "FuelStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FuelPrice" ADD CONSTRAINT "FuelPrice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Fueling" ADD CONSTRAINT "Fueling_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Fueling" ADD CONSTRAINT "Fueling_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Fueling" ADD CONSTRAINT "Fueling_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "FuelStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fueling" ADD CONSTRAINT "Fueling_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Fueling" ADD CONSTRAINT "Fueling_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Fueling" ADD CONSTRAINT "Fueling_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Fueling" ADD CONSTRAINT "Fueling_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
