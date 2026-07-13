CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'BIDDING', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED', 'CANCELLED');
CREATE TYPE "ContractType" AS ENUM ('PUBLIC_BID', 'DIRECT_AWARD', 'FRAMEWORK', 'PRIVATE');
CREATE TYPE "ContractDocumentType" AS ENUM ('NOTICE', 'PROPOSAL', 'CONTRACT', 'AMENDMENT', 'GUARANTEE', 'CERTIFICATE', 'INVOICE', 'OTHER');
CREATE TYPE "ContractTimelineType" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'AMENDMENT_ADDED', 'DOCUMENT_UPLOADED', 'VEHICLE_ALLOCATED', 'VEHICLE_RELEASED', 'ALERT_CREATED', 'ARCHIVED');

CREATE TABLE "Contract" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "branchId" TEXT, "managerUserId" TEXT,
  "number" TEXT NOT NULL, "biddingNumber" TEXT, "title" TEXT NOT NULL, "object" TEXT NOT NULL,
  "clientName" TEXT NOT NULL, "clientDocument" TEXT, "agency" TEXT, "type" "ContractType" NOT NULL,
  "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT', "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL, "signedAt" TIMESTAMP(3), "totalValue" DECIMAL(16,2) NOT NULL,
  "consumedValue" DECIMAL(16,2) NOT NULL DEFAULT 0, "guaranteeValue" DECIMAL(16,2),
  "renewalNoticeDays" INTEGER NOT NULL DEFAULT 60, "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3), CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractAmendment" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "contractId" TEXT NOT NULL, "number" TEXT NOT NULL,
  "description" TEXT NOT NULL, "signedAt" TIMESTAMP(3), "effectiveAt" TIMESTAMP(3) NOT NULL,
  "previousEndAt" TIMESTAMP(3), "newEndAt" TIMESTAMP(3), "valueChange" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "createdById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ContractAmendment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractDocument" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "contractId" TEXT NOT NULL,
  "type" "ContractDocumentType" NOT NULL, "storageKey" TEXT NOT NULL, "url" TEXT NOT NULL,
  "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "sizeInBytes" INTEGER, "issueDate" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3), "alertDaysBefore" INTEGER NOT NULL DEFAULT 30, "notes" TEXT,
  "uploadedById" TEXT, "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractVehicleAllocation" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "contractId" TEXT NOT NULL, "vehicleId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "endsAt" TIMESTAMP(3),
  "monthlyValue" DECIMAL(14,2), "notes" TEXT, "allocatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractVehicleAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractTimelineEvent" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "contractId" TEXT NOT NULL,
  "type" "ContractTimelineType" NOT NULL, "title" TEXT NOT NULL, "description" TEXT,
  "metadata" JSONB, "actorId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contract_companyId_number_key" ON "Contract"("companyId", "number");
CREATE INDEX "Contract_companyId_status_idx" ON "Contract"("companyId", "status");
CREATE INDEX "Contract_companyId_endsAt_idx" ON "Contract"("companyId", "endsAt");
CREATE INDEX "Contract_companyId_branchId_idx" ON "Contract"("companyId", "branchId");
CREATE INDEX "Contract_managerUserId_idx" ON "Contract"("managerUserId");
CREATE INDEX "Contract_archivedAt_idx" ON "Contract"("archivedAt");
CREATE UNIQUE INDEX "ContractAmendment_contractId_number_key" ON "ContractAmendment"("contractId", "number");
CREATE INDEX "ContractAmendment_companyId_effectiveAt_idx" ON "ContractAmendment"("companyId", "effectiveAt");
CREATE INDEX "ContractAmendment_createdById_idx" ON "ContractAmendment"("createdById");
CREATE INDEX "ContractDocument_companyId_expiresAt_idx" ON "ContractDocument"("companyId", "expiresAt");
CREATE INDEX "ContractDocument_contractId_type_idx" ON "ContractDocument"("contractId", "type");
CREATE INDEX "ContractDocument_uploadedById_idx" ON "ContractDocument"("uploadedById");
CREATE INDEX "ContractVehicleAllocation_companyId_endsAt_idx" ON "ContractVehicleAllocation"("companyId", "endsAt");
CREATE INDEX "ContractVehicleAllocation_contractId_startsAt_idx" ON "ContractVehicleAllocation"("contractId", "startsAt");
CREATE INDEX "ContractVehicleAllocation_vehicleId_endsAt_idx" ON "ContractVehicleAllocation"("vehicleId", "endsAt");
CREATE INDEX "ContractTimelineEvent_companyId_createdAt_idx" ON "ContractTimelineEvent"("companyId", "createdAt");
CREATE INDEX "ContractTimelineEvent_contractId_createdAt_idx" ON "ContractTimelineEvent"("contractId", "createdAt");
CREATE INDEX "ContractTimelineEvent_actorId_idx" ON "ContractTimelineEvent"("actorId");

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractAmendment" ADD CONSTRAINT "ContractAmendment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractAmendment" ADD CONSTRAINT "ContractAmendment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractAmendment" ADD CONSTRAINT "ContractAmendment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractVehicleAllocation" ADD CONSTRAINT "ContractVehicleAllocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractVehicleAllocation" ADD CONSTRAINT "ContractVehicleAllocation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractVehicleAllocation" ADD CONSTRAINT "ContractVehicleAllocation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractVehicleAllocation" ADD CONSTRAINT "ContractVehicleAllocation_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractTimelineEvent" ADD CONSTRAINT "ContractTimelineEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractTimelineEvent" ADD CONSTRAINT "ContractTimelineEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContractTimelineEvent" ADD CONSTRAINT "ContractTimelineEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Vehicle"
SET "observations" = CONCAT_WS(E'\n', "observations", '[migration] Legacy contract reference: ' || "contractId"),
    "contractId" = NULL
WHERE "contractId" IS NOT NULL;

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
