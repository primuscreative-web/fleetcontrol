import type { Prisma, WorkshopStatus, WorkshopType } from "@fleetcontrol/database";
export const WORKSHOPS_REPOSITORY = Symbol("WORKSHOPS_REPOSITORY");
export interface WorkshopFilters {
  companyId: string;
  branchId?: string;
  search?: string;
  status?: WorkshopStatus;
  type?: WorkshopType;
  city?: string;
  page: number;
  pageSize: number;
}
export interface WorkshopsRepository {
  list(filters: WorkshopFilters): Promise<{ data: unknown[]; total: number }>;
  findById(companyId: string, id: string): Promise<unknown | null>;
  create(data: Prisma.WorkshopCreateInput): Promise<unknown>;
}
