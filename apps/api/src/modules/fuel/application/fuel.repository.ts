import type { FuelingStatus, Prisma } from "@fleetcontrol/database";
export interface FuelingFilters {
  companyId: string;
  branchId?: string;
  search?: string;
  status?: FuelingStatus;
  vehicleId?: string;
  stationId?: string;
  page: number;
  pageSize: number;
}
export interface FuelRepository {
  list(filters: FuelingFilters): Promise<{ data: unknown[]; total: number }>;
  findById(companyId: string, id: string): Promise<unknown | null>;
  create(data: Prisma.FuelingCreateInput): Promise<unknown>;
}
export const FUEL_REPOSITORY = Symbol("FUEL_REPOSITORY");
