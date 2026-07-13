import { apiRequest } from "./api-client";

export interface DriverOption {
  value: string;
  label: string;
}
export interface DriverNamedEntity {
  id: string;
  name: string;
}
export interface DriverVehicle {
  id: string;
  plate: string;
  status: string;
}
export interface DriverAssignment {
  id: string;
  vehicleId: string;
  startsAt: string;
  endsAt?: string | null;
  isPrimary: boolean;
  vehicle: DriverVehicle;
}
export interface DriverDocument {
  id: string;
  type: string;
  fileName: string;
  url: string;
  expiresAt?: string | null;
}
export interface DriverTimeline {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  createdAt: string;
}
export interface DriverRecord {
  id: string;
  name: string;
  cpf: string;
  cnhNumber: string;
  cnhCategory: string;
  cnhIssuedAt?: string | null;
  cnhExpiresAt: string;
  birthDate?: string | null;
  hireDate?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  branchId?: string | null;
  departmentId?: string | null;
  userId?: string | null;
  medicalExamExpiresAt?: string | null;
  toxicologyExamExpiresAt?: string | null;
  notes?: string | null;
  archivedAt?: string | null;
  branch?: DriverNamedEntity | null;
  department?: DriverNamedEntity | null;
  assignments?: DriverAssignment[];
  documents?: DriverDocument[];
  timeline?: DriverTimeline[];
}
export interface DriverPayload {
  name: string;
  cpf: string;
  cnhNumber: string;
  cnhCategory: string;
  cnhExpiresAt: string;
  cnhIssuedAt?: string;
  birthDate?: string;
  hireDate?: string;
  phone?: string;
  email?: string;
  status?: string;
  branchId?: string;
  departmentId?: string;
  userId?: string;
  medicalExamExpiresAt?: string;
  toxicologyExamExpiresAt?: string;
  notes?: string;
}
export interface DriversOptions {
  statuses: DriverOption[];
  branches: DriverNamedEntity[];
  departments: DriverNamedEntity[];
  vehicles: DriverVehicle[];
}
export interface DriversDashboard {
  active: number;
  onLeave: number;
  suspended: number;
  expiredCnh: number;
  expiringCnh: number;
  withoutVehicle: number;
  expiringMedical: number;
}
export interface DriversListResponse {
  data: DriverRecord[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
}

export const getDriversDashboard = () => apiRequest<DriversDashboard>("/drivers/dashboard");
export const getDriversOptions = () => apiRequest<DriversOptions>("/drivers/options");
export function listDrivers(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<DriversListResponse>(`/drivers${query ? `?${query}` : ""}`);
}
export const getDriver = (id: string) => apiRequest<DriverRecord>(`/drivers/${id}`);
export function createDriver(payload: DriverPayload) {
  return apiRequest<DriverRecord>("/drivers", {
    method: "POST",
    body: JSON.stringify(clean(payload)),
  });
}
export function updateDriver(id: string, payload: DriverPayload) {
  return apiRequest<DriverRecord>(`/drivers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(clean(payload)),
  });
}
export function changeDriverStatus(id: string, status: string, reason?: string) {
  return apiRequest<DriverRecord>(`/drivers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}
export function assignDriverVehicle(id: string, vehicleId: string, notes?: string) {
  return apiRequest<DriverAssignment>(`/drivers/${id}/assignments`, {
    method: "POST",
    body: JSON.stringify({ vehicleId, notes }),
  });
}
export function unassignDriverVehicle(id: string, assignmentId: string, reason?: string) {
  return apiRequest<DriverAssignment>(`/drivers/${id}/assignments/${assignmentId}/end`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}
export function addDriverDocument(id: string, payload: Record<string, unknown>) {
  return apiRequest<DriverDocument>(`/drivers/${id}/documents`, {
    method: "POST",
    body: JSON.stringify(clean(payload)),
  });
}
export function archiveDriver(id: string, reason?: string) {
  return apiRequest<{ archived: boolean }>(`/drivers/${id}/archive`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
function clean<T extends object>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined),
  );
}
