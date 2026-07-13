import { apiRequest } from "./api-client";
export interface Tire {
  id: string;
  serialNumber: string;
  fireNumber?: string | null;
  brand: string;
  model: string;
  size: string;
  status: string;
  condition: string;
  currentPosition?: string | null;
  installedOdometer?: number | null;
  accumulatedKm: number;
  currentTreadDepthMm?: number | null;
  minimumTreadDepthMm: number;
  retreadCount: number;
  maxRetreads: number;
  totalLifecycleCost: number;
  costPerKm: number;
  currentVehicle?: { id: string; plate: string; status?: string } | null;
  movements?: Array<{
    id: string;
    type: string;
    occurredAt: string;
    fromPosition?: string | null;
    toPosition?: string | null;
    reason?: string | null;
    odometer?: number | null;
  }>;
  inspections?: Array<{
    id: string;
    inspectedAt: string;
    condition: string;
    pressurePsi?: number | null;
    averageTreadDepthMm?: number | null;
    irregularWear: boolean;
    hasDamage: boolean;
  }>;
  retreads?: Array<{
    id: string;
    status: string;
    providerName: string;
    cost: number;
    requestedAt: string;
  }>;
}
export interface TiresDashboard {
  inStock: number;
  installed: number;
  attention: number;
  inRetread: number;
  lifecycleCost: number;
  accumulatedKm: number;
  costPerKm: number;
  averageTreadDepthMm: number;
}
export interface TiresOptions {
  vehicles: Array<{ id: string; plate: string; currentOdometer?: number | null }>;
  positions: string[];
  statuses: string[];
  conditions: string[];
}
export const getTiresDashboard = () => apiRequest<TiresDashboard>("/tires/dashboard");
export const getTires = (filters: { status?: string; search?: string } = {}) => {
  const params = new URLSearchParams({ pageSize: "50" });
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  return apiRequest<{ data: Tire[]; pagination: { total: number } }>(`/tires?${params}`);
};
export const getTire = (id: string) => apiRequest<Tire>(`/tires/${id}`);
export const getTiresOptions = () => apiRequest<TiresOptions>("/tires/options");
export const createTire = (body: Record<string, unknown>) =>
  apiRequest<Tire>("/tires", { method: "POST", body: JSON.stringify(body) });
export const tireAction = (
  id: string,
  action: string,
  body: Record<string, unknown>,
  method: "POST" | "PATCH" = "PATCH",
) => apiRequest(`/tires/${id}/${action}`, { method, body: JSON.stringify(body) });
