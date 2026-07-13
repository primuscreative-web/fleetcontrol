CREATE TYPE "WorkshopType" AS ENUM ('INTERNAL','EXTERNAL','MOBILE');
CREATE TYPE "WorkshopStatus" AS ENUM ('PENDING_APPROVAL','APPROVED','SUSPENDED','REJECTED','INACTIVE');
CREATE TYPE "WorkshopServiceCategory" AS ENUM ('GENERAL','ENGINE','TRANSMISSION','ELECTRICAL','BRAKES','SUSPENSION','BODYWORK','TIRES','AIR_CONDITIONING','INSPECTION','TOWING');
CREATE TYPE "WorkshopQuoteStatus" AS ENUM ('DRAFT','SUBMITTED','SELECTED','REJECTED','EXPIRED','CANCELLED');
ALTER TABLE "MaintenanceOrder" ADD COLUMN "workshopId" TEXT;

CREATE TABLE "Workshop" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "branchId" TEXT, "approvedById" TEXT, "code" TEXT,
 "legalName" TEXT NOT NULL, "tradeName" TEXT NOT NULL, "document" TEXT NOT NULL, "stateRegistration" TEXT,
 "type" "WorkshopType" NOT NULL DEFAULT 'EXTERNAL', "status" "WorkshopStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
 "contactName" TEXT, "email" TEXT, "phone" TEXT, "whatsapp" TEXT, "address" TEXT, "city" TEXT, "state" TEXT,
 "postalCode" TEXT, "latitude" DECIMAL(10,7), "longitude" DECIMAL(10,7), "paymentTermsDays" INTEGER,
 "defaultWarrantyDays" INTEGER, "slaResponseHours" INTEGER, "slaCompletionDays" INTEGER, "approvedAt" TIMESTAMP(3),
 "suspendedAt" TIMESTAMP(3), "suspensionReason" TEXT, "rating" DECIMAL(4,2) NOT NULL DEFAULT 0,
 "evaluationCount" INTEGER NOT NULL DEFAULT 0, "totalBilled" DECIMAL(16,2) NOT NULL DEFAULT 0, "notes" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "archivedAt" TIMESTAMP(3),
 CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkshopService" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "workshopId" TEXT NOT NULL, "category" "WorkshopServiceCategory" NOT NULL,
 "name" TEXT NOT NULL, "description" TEXT, "laborRate" DECIMAL(14,2), "fixedPrice" DECIMAL(14,2),
 "estimatedHours" DECIMAL(8,2), "warrantyDays" INTEGER, "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "WorkshopService_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkshopQuote" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "workshopId" TEXT NOT NULL, "maintenanceOrderId" TEXT NOT NULL,
 "createdById" TEXT, "number" TEXT NOT NULL, "status" "WorkshopQuoteStatus" NOT NULL DEFAULT 'DRAFT',
 "submittedAt" TIMESTAMP(3), "validUntil" TIMESTAMP(3), "estimatedStartAt" TIMESTAMP(3), "estimatedCompletionAt" TIMESTAMP(3),
 "laborAmount" DECIMAL(14,2) NOT NULL DEFAULT 0, "partsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
 "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0, "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
 "warrantyDays" INTEGER, "paymentTermsDays" INTEGER, "notes" TEXT, "selectedAt" TIMESTAMP(3), "rejectionReason" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "WorkshopQuote_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkshopQuoteItem" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "quoteId" TEXT NOT NULL, "category" "MaintenanceItemType" NOT NULL,
 "description" TEXT NOT NULL, "sku" TEXT, "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
 "unitPrice" DECIMAL(14,4) NOT NULL DEFAULT 0, "totalPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WorkshopQuoteItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkshopEvaluation" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "workshopId" TEXT NOT NULL, "maintenanceOrderId" TEXT NOT NULL,
 "createdById" TEXT, "qualityScore" INTEGER NOT NULL, "timelinessScore" INTEGER NOT NULL, "serviceScore" INTEGER NOT NULL,
 "costBenefitScore" INTEGER NOT NULL, "overallScore" DECIMAL(4,2) NOT NULL, "wouldRecommend" BOOLEAN NOT NULL DEFAULT true,
 "comments" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "WorkshopEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workshop_companyId_document_key" ON "Workshop"("companyId","document");
CREATE UNIQUE INDEX "Workshop_companyId_code_key" ON "Workshop"("companyId","code");
CREATE INDEX "Workshop_companyId_status_idx" ON "Workshop"("companyId","status");
CREATE INDEX "Workshop_companyId_branchId_idx" ON "Workshop"("companyId","branchId");
CREATE INDEX "Workshop_companyId_city_state_idx" ON "Workshop"("companyId","city","state");
CREATE INDEX "Workshop_companyId_rating_idx" ON "Workshop"("companyId","rating");
CREATE INDEX "Workshop_archivedAt_idx" ON "Workshop"("archivedAt");
CREATE UNIQUE INDEX "WorkshopService_workshopId_name_key" ON "WorkshopService"("workshopId","name");
CREATE INDEX "WorkshopService_companyId_category_active_idx" ON "WorkshopService"("companyId","category","active");
CREATE UNIQUE INDEX "WorkshopQuote_workshopId_number_key" ON "WorkshopQuote"("workshopId","number");
CREATE UNIQUE INDEX "WorkshopQuote_maintenanceOrderId_workshopId_key" ON "WorkshopQuote"("maintenanceOrderId","workshopId");
CREATE INDEX "WorkshopQuote_companyId_status_validUntil_idx" ON "WorkshopQuote"("companyId","status","validUntil");
CREATE INDEX "WorkshopQuote_maintenanceOrderId_status_idx" ON "WorkshopQuote"("maintenanceOrderId","status");
CREATE INDEX "WorkshopQuoteItem_companyId_category_idx" ON "WorkshopQuoteItem"("companyId","category");
CREATE INDEX "WorkshopQuoteItem_quoteId_idx" ON "WorkshopQuoteItem"("quoteId");
CREATE UNIQUE INDEX "WorkshopEvaluation_maintenanceOrderId_key" ON "WorkshopEvaluation"("maintenanceOrderId");
CREATE INDEX "WorkshopEvaluation_companyId_createdAt_idx" ON "WorkshopEvaluation"("companyId","createdAt");
CREATE INDEX "WorkshopEvaluation_workshopId_createdAt_idx" ON "WorkshopEvaluation"("workshopId","createdAt");
CREATE INDEX "MaintenanceOrder_workshopId_idx" ON "MaintenanceOrder"("workshopId");

ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkshopService" ADD CONSTRAINT "WorkshopService_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopService" ADD CONSTRAINT "WorkshopService_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopQuote" ADD CONSTRAINT "WorkshopQuote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopQuote" ADD CONSTRAINT "WorkshopQuote_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopQuote" ADD CONSTRAINT "WorkshopQuote_maintenanceOrderId_fkey" FOREIGN KEY ("maintenanceOrderId") REFERENCES "MaintenanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopQuote" ADD CONSTRAINT "WorkshopQuote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkshopQuoteItem" ADD CONSTRAINT "WorkshopQuoteItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopQuoteItem" ADD CONSTRAINT "WorkshopQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "WorkshopQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopEvaluation" ADD CONSTRAINT "WorkshopEvaluation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopEvaluation" ADD CONSTRAINT "WorkshopEvaluation_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopEvaluation" ADD CONSTRAINT "WorkshopEvaluation_maintenanceOrderId_fkey" FOREIGN KEY ("maintenanceOrderId") REFERENCES "MaintenanceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkshopEvaluation" ADD CONSTRAINT "WorkshopEvaluation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceOrder" ADD CONSTRAINT "MaintenanceOrder_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
