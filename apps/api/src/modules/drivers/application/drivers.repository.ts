import type { DriverStatus, Prisma } from "@fleetcontrol/database";

export interface DriverListFilters {
  companyId: string;
  branchId?: string;
  departmentId?: string;
  search?: string;
  status?: DriverStatus;
  page: number;
  pageSize: number;
}

export interface DriversRepository {
  list(filters: DriverListFilters): Promise<{ data: unknown[]; total: number }>;
  findById(companyId: string, id: string): Promise<unknown | null>;
  create(data: Prisma.DriverCreateInput): Promise<unknown>;
  update(companyId: string, id: string, data: Prisma.DriverUpdateInput): Promise<unknown>;
}

export const DRIVERS_REPOSITORY = Symbol("DRIVERS_REPOSITORY");
