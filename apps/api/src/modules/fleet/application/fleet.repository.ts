import type { Prisma } from "@fleetcontrol/database";

export interface VehicleListFilters {
  companyId: string;
  branchId?: string;
  departmentId?: string;
  search?: string;
  status?: string;
  categoryId?: string;
  makeId?: string;
  modelId?: string;
  page: number;
  pageSize: number;
  orderBy: "createdAt" | "plate" | "status" | "modelYear";
  orderDirection: "asc" | "desc";
}

export interface FleetRepository {
  listVehicles(filters: VehicleListFilters): Promise<{ data: unknown[]; total: number }>;
  findVehicleById(companyId: string, id: string): Promise<unknown | null>;
  createVehicle(data: Prisma.VehicleCreateInput): Promise<unknown>;
  updateVehicle(companyId: string, id: string, data: Prisma.VehicleUpdateInput): Promise<unknown>;
  createTimelineEvent(data: Prisma.VehicleTimelineEventCreateInput): Promise<unknown>;
  addPhoto(data: Prisma.VehiclePhotoCreateInput): Promise<unknown>;
  addDocument(data: Prisma.VehicleDocumentCreateInput): Promise<unknown>;
}

export const FLEET_REPOSITORY = Symbol("FLEET_REPOSITORY");
