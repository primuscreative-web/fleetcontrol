import { apiRequest } from "./api-client";

export interface FleetOption {
  value: string;
  label: string;
}

export interface FleetNamedEntity {
  id: string;
  name: string;
  code?: string | null;
}

export interface FleetOptions {
  statuses: FleetOption[];
  fuelTypes: FleetOption[];
  documentTypes: FleetOption[];
  costTypes: FleetOption[];
  branches: FleetNamedEntity[];
  departments: FleetNamedEntity[];
  costCenters: FleetNamedEntity[];
  categories: FleetNamedEntity[];
  subcategories: FleetNamedEntity[];
  makes: FleetNamedEntity[];
  models: FleetNamedEntity[];
  versions: FleetNamedEntity[];
}

export interface FleetDashboard {
  active: number;
  available: number;
  stopped: number;
  maintenance: number;
  withoutDriver: number;
  withoutContract: number;
  expiredDocuments: number;
  expiringDocuments: number;
  averageFleetAge: number;
  estimatedFleetValue: number;
}

export interface VehicleRecord {
  id: string;
  plate: string;
  renavam?: string | null;
  chassis?: string | null;
  color?: string | null;
  modelYear?: number | null;
  manufactureYear?: number | null;
  status: string;
  fuelType?: string | null;
  estimatedValue?: number | null;
  currentOdometer?: number | null;
  vehicleType?: string | null;
  operationalCategory?: string | null;
  contractId?: string | null;
  observations?: string | null;
  branch?: FleetNamedEntity | null;
  department?: FleetNamedEntity | null;
  costCenter?: FleetNamedEntity | null;
  category?: FleetNamedEntity | null;
  subcategory?: FleetNamedEntity | null;
  make?: FleetNamedEntity | null;
  model?: FleetNamedEntity | null;
  version?: FleetNamedEntity | null;
  photos?: VehiclePhoto[];
  documents?: VehicleDocument[];
  timeline?: VehicleTimelineEvent[];
  costs?: VehicleCostAggregate[];
}

export interface VehiclePhoto {
  id: string;
  url: string;
  fileName: string;
  isPrimary: boolean;
  uploadedAt: string;
}

export interface VehicleDocument {
  id: string;
  type: string;
  url: string;
  fileName: string;
  issueDate?: string | null;
  expiresAt?: string | null;
  responsibleName?: string | null;
  notes?: string | null;
}

export interface VehicleTimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  createdAt: string;
  actor?: { name: string; email: string } | null;
}

export interface VehicleCostAggregate {
  id: string;
  costType: string;
  month: string;
  amount: number;
  distance?: number | null;
}

export interface VehicleAuditEntry {
  id: string;
  action: string;
  tableName: string;
  recordId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
}

export interface VehicleDomainEvent {
  id: string;
  name: string;
  aggregateType: string;
  aggregateId?: string | null;
  status: string;
  payload: unknown;
  createdAt: string;
}

export interface VehicleListResponse {
  data: VehicleRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
}

export interface VehiclePayload {
  plate: string;
  categoryId?: string;
  subcategoryId?: string;
  makeId?: string;
  modelId?: string;
  versionId?: string;
  manufactureYear?: number;
  modelYear?: number;
  color?: string;
  renavam?: string;
  chassis?: string;
  engineNumber?: string;
  power?: string;
  fuelType?: string;
  capacity?: string;
  grossWeight?: number;
  netWeight?: number;
  axleCount?: number;
  vehicleType?: string;
  operationalCategory?: string;
  branchId?: string;
  costCenterId?: string;
  departmentId?: string;
  contractId?: string;
  status?: string;
  estimatedValue?: number;
  currentOdometer?: number;
  observations?: string;
}

export function getFleetDashboard() {
  return apiRequest<FleetDashboard>("/fleet/vehicles/dashboard");
}

export function getFleetOptions() {
  return apiRequest<FleetOptions>("/fleet/vehicles/options");
}

export function listVehicles(searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return apiRequest<VehicleListResponse>(`/fleet/vehicles${query ? `?${query}` : ""}`);
}

export function getVehicle(id: string) {
  return apiRequest<VehicleRecord>(`/fleet/vehicles/${id}`);
}

export function createVehicle(payload: VehiclePayload) {
  return apiRequest<VehicleRecord>("/fleet/vehicles", {
    method: "POST",
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function updateVehicle(id: string, payload: VehiclePayload) {
  return apiRequest<VehicleRecord>(`/fleet/vehicles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function changeVehicleStatus(id: string, status: string, reason?: string) {
  return apiRequest<VehicleRecord>(`/fleet/vehicles/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}

export function transferVehicle(
  id: string,
  payload: { branchId?: string; departmentId?: string; costCenterId?: string; reason?: string },
) {
  return apiRequest<VehicleRecord>(`/fleet/vehicles/${id}/transfer`, {
    method: "POST",
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function addVehiclePhoto(
  id: string,
  payload: {
    storageKey: string;
    url: string;
    fileName: string;
    mimeType: string;
    isPrimary?: boolean;
  },
) {
  return apiRequest<VehiclePhoto>(`/fleet/vehicles/${id}/photos`, {
    method: "POST",
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function addVehicleDocument(
  id: string,
  payload: {
    type: string;
    storageKey: string;
    url: string;
    fileName: string;
    mimeType: string;
    issueDate?: string;
    expiresAt?: string;
    responsibleName?: string;
    notes?: string;
  },
) {
  return apiRequest<VehicleDocument>(`/fleet/vehicles/${id}/documents`, {
    method: "POST",
    body: JSON.stringify(cleanPayload(payload)),
  });
}

export function getVehicleCosts(id: string) {
  return apiRequest<{
    total: number;
    monthly: number;
    costPerKm: number;
    byType: VehicleCostAggregate[];
  }>(`/fleet/vehicles/${id}/costs`);
}

export function getVehicleRelationships(id: string) {
  return apiRequest<{
    vehicleId: string;
    prepared: Record<string, boolean>;
    current: Record<string, unknown>;
  }>(`/fleet/vehicles/${id}/relationships`);
}

export function getVehicleAudit(id: string) {
  return apiRequest<VehicleAuditEntry[]>(`/fleet/vehicles/${id}/audit`);
}

export function getVehicleEvents(id: string) {
  return apiRequest<VehicleDomainEvent[]>(`/fleet/vehicles/${id}/events`);
}

function cleanPayload<T extends object>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined),
  ) as Partial<T>;
}
