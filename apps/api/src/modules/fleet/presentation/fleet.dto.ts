import type { VehicleDocumentType, VehicleFuelType, VehicleStatus } from "@fleetcontrol/database";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

const vehicleStatuses = [
  "AVAILABLE",
  "OPERATING",
  "ON_TRIP",
  "IN_MAINTENANCE",
  "STOPPED",
  "BLOCKED",
  "RESERVED",
  "INACTIVE",
  "WRITTEN_OFF",
] as const satisfies readonly VehicleStatus[];

const vehicleFuelTypes = [
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

const vehicleDocumentTypes = [
  "CRLV",
  "IPVA",
  "INSURANCE",
  "LICENSING",
  "ANTT",
  "TACHOGRAPH",
  "CHRONOTACHOGRAPH",
  "OTHER",
] as const satisfies readonly VehicleDocumentType[];

export class ListVehiclesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(vehicleStatuses)
  status?: VehicleStatus;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  makeId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsIn(["createdAt", "plate", "status", "modelYear"])
  orderBy?: "createdAt" | "plate" | "status" | "modelYear";

  @IsOptional()
  @IsIn(["asc", "desc"])
  orderDirection?: "asc" | "desc";
}

export class CreateVehicleDto {
  @IsString()
  plate!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  makeId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  versionId?: string;

  @IsOptional()
  @IsInt()
  manufactureYear?: number;

  @IsOptional()
  @IsInt()
  modelYear?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  renavam?: string;

  @IsOptional()
  @IsString()
  chassis?: string;

  @IsOptional()
  @IsString()
  engineNumber?: string;

  @IsOptional()
  @IsString()
  power?: string;

  @IsOptional()
  @IsIn(vehicleFuelTypes)
  fuelType?: VehicleFuelType;

  @IsOptional()
  @IsString()
  capacity?: string;

  @IsOptional()
  @IsNumber()
  grossWeight?: number;

  @IsOptional()
  @IsNumber()
  netWeight?: number;

  @IsOptional()
  @IsInt()
  axleCount?: number;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  operationalCategory?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  costCenterId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsIn(vehicleStatuses)
  status?: VehicleStatus;

  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @IsOptional()
  @IsNumber()
  currentOdometer?: number;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreateFleetCatalogDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  makeId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class UpdateVehicleDto extends CreateVehicleDto {}

export class ChangeVehicleStatusDto {
  @IsIn(vehicleStatuses)
  status!: VehicleStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferVehicleDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  costCenterId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ArchiveVehicleDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateVehicleSavedFilterDto {
  @IsString()
  name!: string;

  @IsObject()
  filters!: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateVehiclePhotoDto {
  @IsString()
  storageKey!: string;

  @IsString()
  url!: string;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsInt()
  sizeInBytes?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateVehicleDocumentDto {
  @IsIn(vehicleDocumentTypes)
  type!: VehicleDocumentType;

  @IsString()
  storageKey!: string;

  @IsString()
  url!: string;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsOptional()
  @IsInt()
  sizeInBytes?: number;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  responsibleName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  alertDaysBefore?: number;
}
