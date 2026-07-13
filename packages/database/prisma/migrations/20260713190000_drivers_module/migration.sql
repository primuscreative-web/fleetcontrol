CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE', 'TERMINATED');
CREATE TYPE "DriverDocumentType" AS ENUM ('CNH', 'MEDICAL_CERTIFICATE', 'TOXICOLOGY_EXAM', 'TRAINING_CERTIFICATE', 'IDENTITY', 'ADDRESS_PROOF', 'OTHER');
CREATE TYPE "DriverTimelineType" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'VEHICLE_ASSIGNED', 'VEHICLE_UNASSIGNED', 'DOCUMENT_UPLOADED', 'ALERT_CREATED', 'ARCHIVED');

CREATE TABLE "Driver" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "branchId" TEXT,
  "departmentId" TEXT,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "cnhNumber" TEXT NOT NULL,
  "cnhCategory" TEXT NOT NULL,
  "cnhIssuedAt" TIMESTAMP(3),
  "cnhExpiresAt" TIMESTAMP(3) NOT NULL,
  "birthDate" TIMESTAMP(3),
  "hireDate" TIMESTAMP(3),
  "terminationDate" TIMESTAMP(3),
  "phone" TEXT,
  "email" TEXT,
  "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
  "medicalExamExpiresAt" TIMESTAMP(3),
  "toxicologyExamExpiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverDocument" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "type" "DriverDocumentType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeInBytes" INTEGER,
  "issueDate" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "alertDaysBefore" INTEGER NOT NULL DEFAULT 30,
  "notes" TEXT,
  "uploadedById" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverVehicleAssignment" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "isPrimary" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "assignedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverVehicleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverTimelineEvent" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "type" "DriverTimelineType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Driver_companyId_cpf_key" ON "Driver"("companyId", "cpf");
CREATE UNIQUE INDEX "Driver_companyId_cnhNumber_key" ON "Driver"("companyId", "cnhNumber");
CREATE INDEX "Driver_companyId_status_idx" ON "Driver"("companyId", "status");
CREATE INDEX "Driver_companyId_branchId_idx" ON "Driver"("companyId", "branchId");
CREATE INDEX "Driver_companyId_cnhExpiresAt_idx" ON "Driver"("companyId", "cnhExpiresAt");
CREATE INDEX "Driver_companyId_medicalExamExpiresAt_idx" ON "Driver"("companyId", "medicalExamExpiresAt");
CREATE INDEX "Driver_userId_idx" ON "Driver"("userId");
CREATE INDEX "Driver_archivedAt_idx" ON "Driver"("archivedAt");
CREATE INDEX "DriverDocument_companyId_expiresAt_idx" ON "DriverDocument"("companyId", "expiresAt");
CREATE INDEX "DriverDocument_driverId_type_idx" ON "DriverDocument"("driverId", "type");
CREATE INDEX "DriverDocument_uploadedById_idx" ON "DriverDocument"("uploadedById");
CREATE INDEX "DriverVehicleAssignment_companyId_endsAt_idx" ON "DriverVehicleAssignment"("companyId", "endsAt");
CREATE INDEX "DriverVehicleAssignment_driverId_startsAt_idx" ON "DriverVehicleAssignment"("driverId", "startsAt");
CREATE INDEX "DriverVehicleAssignment_vehicleId_endsAt_idx" ON "DriverVehicleAssignment"("vehicleId", "endsAt");
CREATE INDEX "DriverTimelineEvent_companyId_createdAt_idx" ON "DriverTimelineEvent"("companyId", "createdAt");
CREATE INDEX "DriverTimelineEvent_driverId_createdAt_idx" ON "DriverTimelineEvent"("driverId", "createdAt");
CREATE INDEX "DriverTimelineEvent_actorId_idx" ON "DriverTimelineEvent"("actorId");

ALTER TABLE "Driver" ADD CONSTRAINT "Driver_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriverTimelineEvent" ADD CONSTRAINT "DriverTimelineEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverTimelineEvent" ADD CONSTRAINT "DriverTimelineEvent_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverTimelineEvent" ADD CONSTRAINT "DriverTimelineEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
