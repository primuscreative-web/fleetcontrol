import type { FuelingSource, FuelingStatus, VehicleFuelType } from "@fleetcontrol/database";
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
const fuels = [
  "GASOLINE",
  "ETHANOL",
  "FLEX",
  "DIESEL",
  "BIODIESEL",
  "ELECTRIC",
  "HYBRID",
  "CNG",
  "OTHER",
] as const satisfies readonly VehicleFuelType[];
const statuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const satisfies readonly FuelingStatus[];
const sources = [
  "MANUAL",
  "IMPORT",
  "FUEL_CARD",
  "INTEGRATION",
] as const satisfies readonly FuelingSource[];
export class ListFuelingsQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(statuses) status?: FuelingStatus;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() stationId?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
export class CreateFuelStationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() document?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() notes?: string;
}
export class CreateFuelPriceDto {
  @IsIn(fuels) fuelType!: VehicleFuelType;
  @IsNumber() @Min(0.0001) price!: number;
  @IsDateString() effectiveAt!: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}
export class CreateFuelingDto {
  @IsString() stationId!: string;
  @IsString() vehicleId!: string;
  @IsOptional() @IsString() driverId?: string;
  @IsIn(fuels) fuelType!: VehicleFuelType;
  @IsOptional() @IsIn(sources) source?: FuelingSource;
  @IsDateString() fueledAt!: string;
  @IsNumber() @Min(0) odometer!: number;
  @IsNumber() @Min(0.001) liters!: number;
  @IsNumber() @Min(0.0001) unitPrice!: number;
  @IsNumber() @Min(0.01) totalAmount!: number;
  @IsOptional() @IsBoolean() fullTank?: boolean;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsOptional() @IsString() externalId?: string;
  @IsOptional() @IsString() receiptStorageKey?: string;
  @IsOptional() @IsString() receiptUrl?: string;
  @IsOptional() @IsString() notes?: string;
}
export class ReviewFuelingDto {
  @IsOptional() @IsString() reason?: string;
}
