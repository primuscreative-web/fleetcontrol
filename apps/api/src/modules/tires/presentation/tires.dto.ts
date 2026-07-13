import type { TireCondition, TireStatus } from "@fleetcontrol/database";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
const statuses = [
  "IN_STOCK",
  "INSTALLED",
  "IN_REPAIR",
  "IN_RETREAD",
  "SCRAPPED",
  "LOST",
] as const satisfies readonly TireStatus[];
const conditions = [
  "NEW",
  "GOOD",
  "FAIR",
  "CRITICAL",
  "CONDEMNED",
] as const satisfies readonly TireCondition[];
export class ListTiresQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(statuses) status?: TireStatus;
  @IsOptional() @IsIn(conditions) condition?: TireCondition;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
export class CreateTireDto {
  @IsString() serialNumber!: string;
  @IsOptional() @IsString() fireNumber?: string;
  @IsString() brand!: string;
  @IsString() model!: string;
  @IsString() size!: string;
  @IsOptional() @IsString() dot?: string;
  @IsOptional() @IsString() loadIndex?: string;
  @IsOptional() @IsString() speedIndex?: string;
  @IsOptional() @IsDateString() manufacturerAt?: string;
  @IsOptional() @IsDateString() purchasedAt?: string;
  @IsOptional() @IsNumber() @Min(0) purchaseCost?: number;
  @IsOptional() @IsString() supplierName?: string;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsOptional() @IsDateString() warrantyUntil?: string;
  @IsOptional() @IsNumber() @Min(0) initialTreadDepthMm?: number;
  @IsOptional() @IsNumber() @Min(0) minimumTreadDepthMm?: number;
  @IsOptional() @IsNumber() @Min(0) recommendedPressurePsi?: number;
  @IsOptional() @IsInt() @Min(0) maxRetreads?: number;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() notes?: string;
}
export class InstallTireDto {
  @IsString() vehicleId!: string;
  @IsString() position!: string;
  @IsNumber() @Min(0) odometer!: number;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsString() reason?: string;
}
export class RemoveTireDto {
  @IsNumber() @Min(0) odometer!: number;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsIn(["IN_STOCK", "IN_REPAIR"]) nextStatus?: TireStatus;
  @IsString() reason!: string;
}
export class RotateTireDto {
  @IsString() position!: string;
  @IsNumber() @Min(0) odometer!: number;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsString() reason?: string;
}
export class InspectTireDto {
  @IsOptional() @IsDateString() inspectedAt?: string;
  @IsOptional() @IsNumber() @Min(0) odometer?: number;
  @IsOptional() @IsNumber() @Min(0) pressurePsi?: number;
  @IsOptional() @IsNumber() @Min(0) treadDepthInnerMm?: number;
  @IsOptional() @IsNumber() @Min(0) treadDepthCenterMm?: number;
  @IsOptional() @IsNumber() @Min(0) treadDepthOuterMm?: number;
  @IsOptional() @IsBoolean() irregularWear?: boolean;
  @IsOptional() @IsBoolean() hasDamage?: boolean;
  @IsOptional() @IsString() recommendedAction?: string;
  @IsOptional() @IsString() photoStorageKey?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() notes?: string;
}
export class RequestRetreadDto {
  @IsString() providerName!: string;
  @IsOptional() @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() notes?: string;
}
export class CompleteRetreadDto {
  @IsNumber() @Min(0) cost!: number;
  @IsNumber() @Min(0.1) newTreadDepthMm!: number;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional() @IsDateString() warrantyUntil?: string;
  @IsOptional() @IsString() invoiceNumber?: string;
}
export class ScrapTireDto {
  @IsString() reason!: string;
  @IsOptional() @IsDateString() occurredAt?: string;
}
