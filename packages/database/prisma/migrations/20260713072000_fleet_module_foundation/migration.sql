-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'OPERATING', 'ON_TRIP', 'IN_MAINTENANCE', 'STOPPED', 'BLOCKED', 'RESERVED', 'INACTIVE', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "VehicleFuelType" AS ENUM ('GASOLINE', 'ETHANOL', 'FLEX', 'DIESEL', 'BIODIESEL', 'ELECTRIC', 'HYBRID', 'CNG', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('CRLV', 'IPVA', 'INSURANCE', 'LICENSING', 'ANTT', 'TACHOGRAPH', 'CHRONOTACHOGRAPH', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleTimelineType" AS ENUM ('CREATED', 'UPDATED', 'TRANSFERRED', 'STATUS_CHANGED', 'DOCUMENT_UPLOADED', 'PHOTO_ADDED', 'CHECKLIST', 'DRIVER', 'FUELING', 'FINE', 'TIRE', 'MAINTENANCE', 'CONTRACT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VehicleCostType" AS ENUM ('FUEL', 'TIRES', 'WORKSHOP', 'PARTS', 'INSURANCE', 'IPVA', 'LICENSING', 'TOLLS', 'FINES', 'OTHER');

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleSubcategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMake" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "departmentId" TEXT,
    "costCenterId" TEXT,
    "contractId" TEXT,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "makeId" TEXT,
    "modelId" TEXT,
    "versionId" TEXT,
    "manufactureYear" INTEGER,
    "modelYear" INTEGER,
    "color" TEXT,
    "plate" TEXT NOT NULL,
    "renavam" TEXT,
    "chassis" TEXT,
    "engineNumber" TEXT,
    "power" TEXT,
    "fuelType" "VehicleFuelType",
    "capacity" TEXT,
    "grossWeight" DECIMAL(12,2),
    "netWeight" DECIMAL(12,2),
    "axleCount" INTEGER,
    "vehicleType" TEXT,
    "operationalCategory" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "estimatedValue" DECIMAL(14,2),
    "currentOdometer" DECIMAL(14,2),
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePhoto" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeInBytes" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehiclePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "VehicleDocumentType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeInBytes" INTEGER,
    "issueDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "responsibleUserId" TEXT,
    "responsibleName" TEXT,
    "notes" TEXT,
    "alertDaysBefore" INTEGER NOT NULL DEFAULT 30,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleTimelineEvent" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "VehicleTimelineType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCostAggregate" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "costType" "VehicleCostType" NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "distance" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCostAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleSavedFilter" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'fleet.vehicles',
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "columns" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleSavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_companyId_name_key" ON "CostCenter"("companyId", "name");
CREATE INDEX "CostCenter_companyId_idx" ON "CostCenter"("companyId");
CREATE INDEX "CostCenter_branchId_idx" ON "CostCenter"("branchId");
CREATE UNIQUE INDEX "VehicleCategory_companyId_name_key" ON "VehicleCategory"("companyId", "name");
CREATE INDEX "VehicleCategory_companyId_idx" ON "VehicleCategory"("companyId");
CREATE UNIQUE INDEX "VehicleSubcategory_companyId_categoryId_name_key" ON "VehicleSubcategory"("companyId", "categoryId", "name");
CREATE INDEX "VehicleSubcategory_companyId_idx" ON "VehicleSubcategory"("companyId");
CREATE INDEX "VehicleSubcategory_categoryId_idx" ON "VehicleSubcategory"("categoryId");
CREATE UNIQUE INDEX "VehicleMake_companyId_name_key" ON "VehicleMake"("companyId", "name");
CREATE INDEX "VehicleMake_companyId_idx" ON "VehicleMake"("companyId");
CREATE UNIQUE INDEX "VehicleModel_companyId_makeId_name_key" ON "VehicleModel"("companyId", "makeId", "name");
CREATE INDEX "VehicleModel_companyId_idx" ON "VehicleModel"("companyId");
CREATE INDEX "VehicleModel_makeId_idx" ON "VehicleModel"("makeId");
CREATE UNIQUE INDEX "VehicleVersion_companyId_modelId_name_key" ON "VehicleVersion"("companyId", "modelId", "name");
CREATE INDEX "VehicleVersion_companyId_idx" ON "VehicleVersion"("companyId");
CREATE INDEX "VehicleVersion_modelId_idx" ON "VehicleVersion"("modelId");
CREATE UNIQUE INDEX "Vehicle_companyId_plate_key" ON "Vehicle"("companyId", "plate");
CREATE UNIQUE INDEX "Vehicle_companyId_renavam_key" ON "Vehicle"("companyId", "renavam");
CREATE UNIQUE INDEX "Vehicle_companyId_chassis_key" ON "Vehicle"("companyId", "chassis");
CREATE INDEX "Vehicle_companyId_status_idx" ON "Vehicle"("companyId", "status");
CREATE INDEX "Vehicle_companyId_branchId_idx" ON "Vehicle"("companyId", "branchId");
CREATE INDEX "Vehicle_companyId_departmentId_idx" ON "Vehicle"("companyId", "departmentId");
CREATE INDEX "Vehicle_companyId_makeId_idx" ON "Vehicle"("companyId", "makeId");
CREATE INDEX "Vehicle_companyId_modelId_idx" ON "Vehicle"("companyId", "modelId");
CREATE INDEX "Vehicle_companyId_categoryId_idx" ON "Vehicle"("companyId", "categoryId");
CREATE INDEX "Vehicle_companyId_archivedAt_idx" ON "Vehicle"("companyId", "archivedAt");
CREATE INDEX "VehiclePhoto_vehicleId_uploadedAt_idx" ON "VehiclePhoto"("vehicleId", "uploadedAt");
CREATE INDEX "VehiclePhoto_companyId_idx" ON "VehiclePhoto"("companyId");
CREATE INDEX "VehiclePhoto_uploadedById_idx" ON "VehiclePhoto"("uploadedById");
CREATE INDEX "VehicleDocument_vehicleId_type_idx" ON "VehicleDocument"("vehicleId", "type");
CREATE INDEX "VehicleDocument_companyId_expiresAt_idx" ON "VehicleDocument"("companyId", "expiresAt");
CREATE INDEX "VehicleDocument_responsibleUserId_idx" ON "VehicleDocument"("responsibleUserId");
CREATE INDEX "VehicleTimelineEvent_vehicleId_createdAt_idx" ON "VehicleTimelineEvent"("vehicleId", "createdAt");
CREATE INDEX "VehicleTimelineEvent_companyId_createdAt_idx" ON "VehicleTimelineEvent"("companyId", "createdAt");
CREATE INDEX "VehicleTimelineEvent_actorId_idx" ON "VehicleTimelineEvent"("actorId");
CREATE UNIQUE INDEX "VehicleCostAggregate_vehicleId_costType_month_key" ON "VehicleCostAggregate"("vehicleId", "costType", "month");
CREATE INDEX "VehicleCostAggregate_companyId_month_idx" ON "VehicleCostAggregate"("companyId", "month");
CREATE INDEX "VehicleCostAggregate_vehicleId_month_idx" ON "VehicleCostAggregate"("vehicleId", "month");
CREATE UNIQUE INDEX "VehicleSavedFilter_companyId_userId_scope_name_key" ON "VehicleSavedFilter"("companyId", "userId", "scope", "name");
CREATE INDEX "VehicleSavedFilter_companyId_userId_scope_idx" ON "VehicleSavedFilter"("companyId", "userId", "scope");

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleCategory" ADD CONSTRAINT "VehicleCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleSubcategory" ADD CONSTRAINT "VehicleSubcategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleSubcategory" ADD CONSTRAINT "VehicleSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VehicleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleMake" ADD CONSTRAINT "VehicleMake_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleVersion" ADD CONSTRAINT "VehicleVersion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleVersion" ADD CONSTRAINT "VehicleVersion_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VehicleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "VehicleSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "VehicleMake"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "VehicleVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehiclePhoto" ADD CONSTRAINT "VehiclePhoto_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehiclePhoto" ADD CONSTRAINT "VehiclePhoto_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehiclePhoto" ADD CONSTRAINT "VehiclePhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleTimelineEvent" ADD CONSTRAINT "VehicleTimelineEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleTimelineEvent" ADD CONSTRAINT "VehicleTimelineEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleTimelineEvent" ADD CONSTRAINT "VehicleTimelineEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleCostAggregate" ADD CONSTRAINT "VehicleCostAggregate_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleCostAggregate" ADD CONSTRAINT "VehicleCostAggregate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleSavedFilter" ADD CONSTRAINT "VehicleSavedFilter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleSavedFilter" ADD CONSTRAINT "VehicleSavedFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
