import { apiRequest } from "./api-client";
export interface MaintenanceItem {
  id?: string;
  type: string;
  description: string;
  sku?: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
}
export interface MaintenanceOrder {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  type: string;
  priority: string;
  status: string;
  odometer: number;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  estimatedCost?: number | null;
  actualCost: number;
  diagnosis?: string | null;
  resolution?: string | null;
  vehicle: { id: string; plate: string; status: string };
  plan?: { id: string; name: string } | null;
  items: MaintenanceItem[];
}
export interface MaintenanceDashboard {
  awaitingApproval: number;
  active: number;
  critical: number;
  plansDueSoon: number;
  monthlyCost: number;
  averageOrderCost: number;
}
export interface MaintenanceOptions {
  vehicles: Array<{ id: string; plate: string; status: string; currentOdometer?: number | null }>;
  plans: Array<{ id: string; name: string; vehicleId: string }>;
  types: string[];
  priorities: string[];
}
export interface MaintenanceOrderPayload {
  code: string;
  vehicleId: string;
  planId?: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  odometer: number;
  scheduledAt?: string;
  estimatedCost?: number;
  notes?: string;
  items?: MaintenanceItem[];
}
export interface MaintenancePlan {
  id: string;
  name: string;
  type: string;
  intervalDays?: number | null;
  intervalKm?: number | null;
  nextDueAt?: string | null;
  nextDueOdometer?: number | null;
  active: boolean;
  vehicle: { id: string; plate: string; currentOdometer?: number | null };
  _count: { orders: number };
}
export const getMaintenanceDashboard = () =>
  apiRequest<MaintenanceDashboard>("/maintenance/dashboard");
export const getMaintenanceOrders = (filters: { status?: string; search?: string } = {}) => {
  const params = new URLSearchParams({ pageSize: "50" });
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  return apiRequest<{ data: MaintenanceOrder[]; pagination: { total: number } }>(
    `/maintenance?${params}`,
  );
};
export const getMaintenanceOrder = (id: string) =>
  apiRequest<MaintenanceOrder>(`/maintenance/${id}`);
export const getMaintenanceOptions = () => apiRequest<MaintenanceOptions>("/maintenance/options");
export const getMaintenancePlans = () => apiRequest<MaintenancePlan[]>("/maintenance/plans");
export const createMaintenancePlan = (body: Record<string, unknown>) =>
  apiRequest<MaintenancePlan>("/maintenance/plans", { method: "POST", body: JSON.stringify(body) });
export const createMaintenanceOrder = (body: MaintenanceOrderPayload) =>
  apiRequest<MaintenanceOrder>("/maintenance", { method: "POST", body: JSON.stringify(body) });
export const transitionMaintenance = (
  id: string,
  action: "approve" | "reject" | "start" | "complete",
  body: Record<string, unknown> = {},
) => apiRequest(`/maintenance/${id}/${action}`, { method: "PATCH", body: JSON.stringify(body) });
