import type { ContractDocumentType, ContractStatus, ContractType } from "@fleetcontrol/database";
import { Transform } from "class-transformer";
import {
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
  "DRAFT",
  "BIDDING",
  "ACTIVE",
  "SUSPENDED",
  "EXPIRED",
  "TERMINATED",
  "CANCELLED",
] as const satisfies readonly ContractStatus[];
const types = [
  "PUBLIC_BID",
  "DIRECT_AWARD",
  "FRAMEWORK",
  "PRIVATE",
] as const satisfies readonly ContractType[];
const documentTypes = [
  "NOTICE",
  "PROPOSAL",
  "CONTRACT",
  "AMENDMENT",
  "GUARANTEE",
  "CERTIFICATE",
  "INVOICE",
  "OTHER",
] as const satisfies readonly ContractDocumentType[];

export class ListContractsQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(statuses) status?: ContractStatus;
  @IsOptional() @IsIn(types) type?: ContractType;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class CreateContractDto {
  @IsString() number!: string;
  @IsOptional() @IsString() biddingNumber?: string;
  @IsString() title!: string;
  @IsString() object!: string;
  @IsString() clientName!: string;
  @IsOptional() @IsString() clientDocument?: string;
  @IsOptional() @IsString() agency?: string;
  @IsIn(types) type!: ContractType;
  @IsOptional() @IsIn(statuses) status?: ContractStatus;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsDateString() signedAt?: string;
  @IsNumber() @Min(0) totalValue!: number;
  @IsOptional() @IsNumber() @Min(0) consumedValue?: number;
  @IsOptional() @IsNumber() @Min(0) guaranteeValue?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) renewalNoticeDays?: number;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() managerUserId?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateContractDto extends CreateContractDto {}
export class ChangeContractStatusDto {
  @IsIn(statuses) status!: ContractStatus;
  @IsOptional() @IsString() reason?: string;
}
export class CreateContractAmendmentDto {
  @IsString() number!: string;
  @IsString() description!: string;
  @IsDateString() effectiveAt!: string;
  @IsOptional() @IsDateString() signedAt?: string;
  @IsOptional() @IsDateString() newEndAt?: string;
  @IsOptional() @IsNumber() valueChange?: number;
}
export class AllocateContractVehicleDto {
  @IsString() vehicleId!: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsNumber() @Min(0) monthlyValue?: number;
  @IsOptional() @IsString() notes?: string;
}
export class ReleaseContractVehicleDto {
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() reason?: string;
}
export class CreateContractDocumentDto {
  @IsIn(documentTypes) type!: ContractDocumentType;
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
export class ArchiveContractDto {
  @IsOptional() @IsString() reason?: string;
}
