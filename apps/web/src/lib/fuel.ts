import { apiRequest } from "./api-client";

export interface FuelDashboard {
  approved: number;
  pending: number;
  anomalies: number;
  liters: number;
  totalAmount: number;
  averageUnitPrice: number;
  averageConsumption: number;
}
export interface Fueling {
  id: string;
  fueledAt: string;
  status: string;
  fuelType: string;
  odometer: number;
  liters: number;
  unitPrice: number;
  totalAmount: number;
  anomaly: boolean;
  anomalyReason?: string | null;
  station: { id: string; name: string };
  vehicle: { id: string; plate: string };
  driver?: { id: string; name: string } | null;
}
export interface FuelOptions {
  stations: Array<{ id: string; name: string }>;
  vehicles: Array<{
    id: string;
    plate: string;
    fuelType?: string | null;
    currentOdometer?: number | null;
  }>;
  drivers: Array<{ id: string; name: string }>;
  fuelTypes: string[];
}
export interface FuelingPayload {
  stationId: string;
  vehicleId: string;
  driverId?: string;
  fuelType: string;
  fueledAt: string;
  odometer: number;
  liters: number;
  unitPrice: number;
  totalAmount: number;
  fullTank: boolean;
  invoiceNumber?: string;
  notes?: string;
}
export const getFuelDashboard = () => apiRequest<FuelDashboard>("/fuel/dashboard");
export const getFuelings = (status?: string, search?: string) =>
  apiRequest<{ data: Fueling[]; pagination: { total: number } }>(
    `/fuel?pageSize=50${status ? `&status=${status}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
  );
export const getFuelOptions = () => apiRequest<FuelOptions>("/fuel/options");
export const createFueling = (body: FuelingPayload) =>
  apiRequest<Fueling>("/fuel", { method: "POST", body: JSON.stringify(body) });
export const reviewFueling = (id: string, action: "approve" | "reject", reason?: string) =>
  apiRequest(`/fuel/${id}/${action}`, { method: "PATCH", body: JSON.stringify({ reason }) });
