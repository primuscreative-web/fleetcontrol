import type {
  MaintenanceItemType,
  WorkshopQuoteStatus,
  WorkshopServiceCategory,
  WorkshopStatus,
  WorkshopType,
} from "@fleetcontrol/database";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
const types = ["INTERNAL", "EXTERNAL", "MOBILE"] as const satisfies readonly WorkshopType[];
const statuses = [
  "PENDING_APPROVAL",
  "APPROVED",
  "SUSPENDED",
  "REJECTED",
  "INACTIVE",
] as const satisfies readonly WorkshopStatus[];
const categories = [
  "GENERAL",
  "ENGINE",
  "TRANSMISSION",
  "ELECTRICAL",
  "BRAKES",
  "SUSPENSION",
  "BODYWORK",
  "TIRES",
  "AIR_CONDITIONING",
  "INSPECTION",
  "TOWING",
] as const satisfies readonly WorkshopServiceCategory[];
const quoteStatuses = [
  "DRAFT",
  "SUBMITTED",
  "SELECTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const satisfies readonly WorkshopQuoteStatus[];
const itemTypes = [
  "LABOR",
  "PART",
  "SERVICE",
  "FEE",
] as const satisfies readonly MaintenanceItemType[];
export class ListWorkshopsQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(statuses) status?: WorkshopStatus;
  @IsOptional() @IsIn(types) type?: WorkshopType;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
export class CreateWorkshopDto {
  @IsOptional() @IsString() code?: string;
  @IsString() legalName!: string;
  @IsString() tradeName!: string;
  @IsString() document!: string;
  @IsOptional() @IsString() stateRegistration?: string;
  @IsOptional() @IsIn(types) type?: WorkshopType;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsInt() @Min(0) paymentTermsDays?: number;
  @IsOptional() @IsInt() @Min(0) defaultWarrantyDays?: number;
  @IsOptional() @IsInt() @Min(0) slaResponseHours?: number;
  @IsOptional() @IsInt() @Min(0) slaCompletionDays?: number;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() notes?: string;
}
export class ReviewWorkshopDto {
  @IsOptional() @IsString() reason?: string;
}
export class CreateWorkshopServiceDto {
  @IsIn(categories) category!: WorkshopServiceCategory;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) laborRate?: number;
  @IsOptional() @IsNumber() @Min(0) fixedPrice?: number;
  @IsOptional() @IsNumber() @Min(0) estimatedHours?: number;
  @IsOptional() @IsInt() @Min(0) warrantyDays?: number;
}
export class CreateQuoteItemDto {
  @IsIn(itemTypes) category!: MaintenanceItemType;
  @IsString() description!: string;
  @IsOptional() @IsString() sku?: string;
  @IsNumber() @Min(0.001) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
}
export class CreateWorkshopQuoteDto {
  @IsString() workshopId!: string;
  @IsString() maintenanceOrderId!: string;
  @IsString() number!: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsDateString() estimatedStartAt?: string;
  @IsOptional() @IsDateString() estimatedCompletionAt?: string;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @IsOptional() @IsInt() @Min(0) warrantyDays?: number;
  @IsOptional() @IsInt() @Min(0) paymentTermsDays?: number;
  @IsOptional() @IsString() notes?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items!: CreateQuoteItemDto[];
}
export class ListWorkshopQuotesQueryDto {
  @IsOptional() @IsString() maintenanceOrderId?: string;
  @IsOptional() @IsString() workshopId?: string;
  @IsOptional() @IsIn(quoteStatuses) status?: WorkshopQuoteStatus;
}
export class EvaluateWorkshopDto {
  @IsString() maintenanceOrderId!: string;
  @IsInt() @Min(1) @Max(5) qualityScore!: number;
  @IsInt() @Min(1) @Max(5) timelinessScore!: number;
  @IsInt() @Min(1) @Max(5) serviceScore!: number;
  @IsInt() @Min(1) @Max(5) costBenefitScore!: number;
  @IsOptional() @IsBoolean() wouldRecommend?: boolean;
  @IsOptional() @IsString() comments?: string;
}
