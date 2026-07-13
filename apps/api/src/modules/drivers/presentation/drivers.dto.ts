import type { DriverDocumentType, DriverStatus } from "@fleetcontrol/database";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

const statuses = [
  "ACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "INACTIVE",
  "TERMINATED",
] as const satisfies readonly DriverStatus[];
const documentTypes = [
  "CNH",
  "MEDICAL_CERTIFICATE",
  "TOXICOLOGY_EXAM",
  "TRAINING_CERTIFICATE",
  "IDENTITY",
  "ADDRESS_PROOF",
  "OTHER",
] as const satisfies readonly DriverDocumentType[];

export class ListDriversQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(statuses) status?: DriverStatus;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class CreateDriverDto {
  @IsString() name!: string;
  @IsString() cpf!: string;
  @IsString() cnhNumber!: string;
  @IsString() cnhCategory!: string;
  @IsDateString() cnhExpiresAt!: string;
  @IsOptional() @IsDateString() cnhIssuedAt?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsDateString() hireDate?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsIn(statuses) status?: DriverStatus;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsDateString() medicalExamExpiresAt?: string;
  @IsOptional() @IsDateString() toxicologyExamExpiresAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateDriverDto extends CreateDriverDto {}

export class ChangeDriverStatusDto {
  @IsIn(statuses) status!: DriverStatus;
  @IsOptional() @IsString() reason?: string;
}

export class AssignVehicleDto {
  @IsString() vehicleId!: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class UnassignVehicleDto {
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() reason?: string;
}

export class CreateDriverDocumentDto {
  @IsIn(documentTypes) type!: DriverDocumentType;
  @IsString() storageKey!: string;
  @IsString() url!: string;
  @IsString() fileName!: string;
  @IsString() mimeType!: string;
  @IsOptional() @IsInt() sizeInBytes?: number;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsInt() @Min(1) @Max(365) alertDaysBefore?: number;
  @IsOptional() @IsString() notes?: string;
}

export class ArchiveDriverDto {
  @IsOptional() @IsString() reason?: string;
}
