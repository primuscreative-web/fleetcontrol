import type {
  MaintenanceItemType,
  MaintenanceOrderStatus,
  MaintenancePriority,
  MaintenanceType,
} from "@fleetcontrol/database";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

const types = [
  "PREVENTIVE",
  "CORRECTIVE",
  "PREDICTIVE",
  "INSPECTION",
  "CAMPAIGN",
] as const satisfies readonly MaintenanceType[];
const priorities = [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
] as const satisfies readonly MaintenancePriority[];
const statuses = [
  "DRAFT",
  "AWAITING_APPROVAL",
  "APPROVED",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const satisfies readonly MaintenanceOrderStatus[];
const itemTypes = [
  "LABOR",
  "PART",
  "SERVICE",
  "FEE",
] as const satisfies readonly MaintenanceItemType[];

export class ListMaintenanceOrdersQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(statuses) status?: MaintenanceOrderStatus;
  @IsOptional() @IsIn(types) type?: MaintenanceType;
  @IsOptional() @IsIn(priorities) priority?: MaintenancePriority;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
export class CreateMaintenanceItemDto {
  @IsIn(itemTypes) type!: MaintenanceItemType;
  @IsString() description!: string;
  @IsOptional() @IsString() sku?: string;
  @IsNumber() @Min(0.001) quantity!: number;
  @IsNumber() @Min(0) unitCost!: number;
  @IsOptional() @IsString() notes?: string;
}
export class CreateMaintenanceOrderDto {
  @IsString() code!: string;
  @IsString() vehicleId!: string;
  @IsOptional() @IsString() planId?: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(types) type!: MaintenanceType;
  @IsOptional() @IsIn(priorities) priority?: MaintenancePriority;
  @IsNumber() @Min(0) odometer!: number;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaintenanceItemDto)
  items?: CreateMaintenanceItemDto[];
}
export class CreateMaintenancePlanDto {
  @IsString() vehicleId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(types) type?: MaintenanceType;
  @IsOptional() @IsInt() @Min(1) intervalDays?: number;
  @IsOptional() @IsNumber() @Min(1) intervalKm?: number;
  @IsOptional() @IsDateString() lastPerformedAt?: string;
  @IsOptional() @IsNumber() @Min(0) lastOdometer?: number;
  @IsOptional() @IsInt() @Min(0) alertDaysBefore?: number;
  @IsOptional() @IsNumber() @Min(0) alertKmBefore?: number;
  @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
}
export class ReviewMaintenanceDto {
  @IsOptional() @IsString() reason?: string;
}
export class StartMaintenanceDto {
  @IsOptional() @IsString() diagnosis?: string;
}
export class CompleteMaintenanceDto {
  @IsString() resolution!: string;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsOptional() @IsDateString() warrantyUntil?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMaintenanceItemDto)
  items?: CreateMaintenanceItemDto[];
}
