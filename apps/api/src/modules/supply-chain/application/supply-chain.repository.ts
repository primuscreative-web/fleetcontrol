import type { Prisma, SupplierCategory, SupplierStatus } from "@fleetcontrol/database";
export const SUPPLY_CHAIN_REPOSITORY = Symbol("SUPPLY_CHAIN_REPOSITORY");
export interface SupplierFilters {
  companyId: string;
  search?: string;
  status?: SupplierStatus;
  category?: SupplierCategory;
  page: number;
  pageSize: number;
}
export interface PartFilters {
  companyId: string;
  search?: string;
  category?: string;
  warehouseId?: string;
  page: number;
  pageSize: number;
}
export interface SupplyChainRepository {
  listSuppliers(filters: SupplierFilters): Promise<{ data: unknown[]; total: number }>;
  findSupplier(companyId: string, id: string): Promise<unknown | null>;
  createSupplier(data: Prisma.SupplierCreateInput): Promise<unknown>;
  listParts(filters: PartFilters): Promise<{ data: unknown[]; total: number }>;
}
