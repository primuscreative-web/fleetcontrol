import type {
  MaintenanceOrderStatus,
  MaintenancePriority,
  MaintenanceType,
  Prisma,
} from "@fleetcontrol/database";
export const MAINTENANCE_REPOSITORY = Symbol("MAINTENANCE_REPOSITORY");
export interface MaintenanceFilters {
  companyId: string;
  branchId?: string;
  search?: string;
  status?: MaintenanceOrderStatus;
  type?: MaintenanceType;
  priority?: MaintenancePriority;
  vehicleId?: string;
  page: number;
  pageSize: number;
}
export interface MaintenanceRepository {
  list(filters: MaintenanceFilters): Promise<{ data: unknown[]; total: number }>;
  findById(companyId: string, id: string): Promise<unknown | null>;
  create(data: Prisma.MaintenanceOrderCreateInput): Promise<unknown>;
}
