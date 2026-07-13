import type { SupplierCategory, SupplierStatus } from "@fleetcontrol/database";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
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
const supplierStatuses = [
  "PENDING_APPROVAL",
  "APPROVED",
  "SUSPENDED",
  "REJECTED",
  "INACTIVE",
] as const satisfies readonly SupplierStatus[];
const categories = [
  "AUTO_PARTS",
  "TIRES",
  "FUEL",
  "SERVICES",
  "EQUIPMENT",
  "GENERAL",
] as const satisfies readonly SupplierCategory[];
export class ListSuppliersQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(supplierStatuses) status?: SupplierStatus;
  @IsOptional() @IsIn(categories) category?: SupplierCategory;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
export class CreateSupplierDto {
  @IsOptional() @IsString() code?: string;
  @IsString() legalName!: string;
  @IsString() tradeName!: string;
  @IsString() document!: string;
  @IsOptional() @IsIn(categories) category?: SupplierCategory;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsInt() @Min(0) paymentTermsDays?: number;
  @IsOptional() @IsInt() @Min(0) leadTimeDays?: number;
  @IsOptional() @IsString() notes?: string;
}
export class ReviewDto {
  @IsOptional() @IsString() reason?: string;
}
export class ListPartsQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
export class CreatePartDto {
  @IsString() sku!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() manufacturerCode?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() @Min(0) minimumStock?: number;
  @IsOptional() @IsNumber() @Min(0) maximumStock?: number;
  @IsOptional() @IsNumber() @Min(0) reorderPoint?: number;
  @IsOptional() compatibleVehicles?: unknown;
  @IsOptional() @IsString() notes?: string;
}
export class LinkPartSupplierDto {
  @IsString() supplierId!: string;
  @IsOptional() @IsString() supplierPartNumber?: string;
  @IsOptional() @IsNumber() @Min(0) lastPrice?: number;
  @IsOptional() @IsInt() @Min(0) leadTimeDays?: number;
  @IsOptional() @IsNumber() @Min(0) minimumOrderQty?: number;
}
export class CreateWarehouseDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() responsibleUserId?: string;
  @IsOptional() @IsString() address?: string;
}
export class PurchaseItemDto {
  @IsString() partId!: string;
  @IsNumber() @Min(0.001) quantity!: number;
  @IsNumber() @Min(0) unitPrice!: number;
  @IsOptional() @IsString() notes?: string;
}
export class CreatePurchaseOrderDto {
  @IsString() number!: string;
  @IsString() supplierId!: string;
  @IsString() warehouseId!: string;
  @IsOptional() expectedAt?: string;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
  @IsOptional() @IsNumber() @Min(0) freightAmount?: number;
  @IsOptional() @IsNumber() @Min(0) taxAmount?: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PurchaseItemDto) items!: PurchaseItemDto[];
  @IsOptional() @IsString() notes?: string;
}
export class ReceiveItemDto {
  @IsString() purchaseOrderItemId!: string;
  @IsNumber() @Min(0.001) quantity!: number;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsOptional() @IsString() reference?: string;
}
export class IssueStockDto {
  @IsString() warehouseId!: string;
  @IsString() partId!: string;
  @IsString() maintenanceOrderId!: string;
  @IsNumber() @Min(0.001) quantity!: number;
  @IsOptional() @IsString() reason?: string;
}
export class TransferStockDto {
  @IsString() fromWarehouseId!: string;
  @IsString() toWarehouseId!: string;
  @IsString() partId!: string;
  @IsNumber() @Min(0.001) quantity!: number;
  @IsOptional() @IsString() reason?: string;
}
export class AdjustStockDto {
  @IsString() warehouseId!: string;
  @IsString() partId!: string;
  @IsNumber() quantity!: number;
  @IsString() reason!: string;
  @IsOptional() @IsNumber() @Min(0) unitCost?: number;
}
