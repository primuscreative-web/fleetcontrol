import type { Prisma, TireCondition, TireStatus } from "@fleetcontrol/database";
export const TIRES_REPOSITORY = Symbol("TIRES_REPOSITORY");
export interface TireFilters {
  companyId: string;
  branchId?: string;
  search?: string;
  status?: TireStatus;
  condition?: TireCondition;
  vehicleId?: string;
  page: number;
  pageSize: number;
}
export interface TiresRepository {
  list(filters: TireFilters): Promise<{ data: unknown[]; total: number }>;
  findById(companyId: string, id: string): Promise<unknown | null>;
  create(data: Prisma.TireCreateInput): Promise<unknown>;
}
