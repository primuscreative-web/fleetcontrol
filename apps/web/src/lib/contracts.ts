import { apiRequest } from "./api-client";
export interface ContractOption {
  value: string;
  label: string;
}
export interface ContractEntity {
  id: string;
  name: string;
  email?: string;
}
export interface ContractVehicle {
  id: string;
  plate: string;
  status: string;
  contractId?: string | null;
}
export interface ContractAllocation {
  id: string;
  startsAt: string;
  endsAt?: string | null;
  monthlyValue?: number | null;
  vehicle: ContractVehicle;
}
export interface ContractAmendment {
  id: string;
  number: string;
  description: string;
  effectiveAt: string;
  newEndAt?: string | null;
  valueChange: number;
}
export interface ContractDocument {
  id: string;
  type: string;
  fileName: string;
  url: string;
  expiresAt?: string | null;
}
export interface ContractTimeline {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
}
export interface ContractRecord {
  id: string;
  number: string;
  biddingNumber?: string | null;
  title: string;
  object: string;
  clientName: string;
  clientDocument?: string | null;
  agency?: string | null;
  type: string;
  status: string;
  startsAt: string;
  endsAt: string;
  signedAt?: string | null;
  totalValue: number;
  consumedValue: number;
  guaranteeValue?: number | null;
  renewalNoticeDays: number;
  branchId?: string | null;
  managerUserId?: string | null;
  notes?: string | null;
  archivedAt?: string | null;
  branch?: ContractEntity | null;
  manager?: ContractEntity | null;
  allocations?: ContractAllocation[];
  amendments?: ContractAmendment[];
  documents?: ContractDocument[];
  timeline?: ContractTimeline[];
}
export interface ContractPayload {
  number: string;
  biddingNumber?: string;
  title: string;
  object: string;
  clientName: string;
  clientDocument?: string;
  agency?: string;
  type: string;
  status?: string;
  startsAt: string;
  endsAt: string;
  signedAt?: string;
  totalValue: number;
  consumedValue?: number;
  guaranteeValue?: number;
  renewalNoticeDays?: number;
  branchId?: string;
  managerUserId?: string;
  notes?: string;
}
export interface ContractsOptions {
  statuses: ContractOption[];
  types: ContractOption[];
  branches: ContractEntity[];
  managers: ContractEntity[];
  vehicles: ContractVehicle[];
}
export interface ContractsDashboard {
  active: number;
  bidding: number;
  expiring: number;
  expired: number;
  allocatedVehicles: number;
  totalValue: number;
  consumedValue: number;
  availableValue: number;
  utilizationPercent: number;
}
export interface ContractsList {
  data: ContractRecord[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
}

export const getContractsDashboard = () => apiRequest<ContractsDashboard>("/contracts/dashboard");
export const getContractsOptions = () => apiRequest<ContractsOptions>("/contracts/options");
export function listContracts(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<ContractsList>(`/contracts${query ? `?${query}` : ""}`);
}
export const getContract = (id: string) => apiRequest<ContractRecord>(`/contracts/${id}`);
export function createContract(payload: ContractPayload) {
  return apiRequest<ContractRecord>("/contracts", {
    method: "POST",
    body: JSON.stringify(clean(payload)),
  });
}
export function updateContract(id: string, payload: ContractPayload) {
  return apiRequest<ContractRecord>(`/contracts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(clean(payload)),
  });
}
export function changeContractStatus(id: string, status: string, reason?: string) {
  return apiRequest<ContractRecord>(`/contracts/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}
export function addContractAmendment(id: string, payload: Record<string, unknown>) {
  return apiRequest<ContractAmendment>(`/contracts/${id}/amendments`, {
    method: "POST",
    body: JSON.stringify(clean(payload)),
  });
}
export function allocateContractVehicle(
  id: string,
  vehicleId: string,
  monthlyValue?: number,
  notes?: string,
) {
  return apiRequest<ContractAllocation>(`/contracts/${id}/allocations`, {
    method: "POST",
    body: JSON.stringify(clean({ vehicleId, monthlyValue, notes })),
  });
}
export function releaseContractVehicle(id: string, allocationId: string, reason?: string) {
  return apiRequest<{ released: boolean }>(`/contracts/${id}/allocations/${allocationId}/release`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}
export function addContractDocument(id: string, payload: Record<string, unknown>) {
  return apiRequest<ContractDocument>(`/contracts/${id}/documents`, {
    method: "POST",
    body: JSON.stringify(clean(payload)),
  });
}
export function archiveContract(id: string, reason?: string) {
  return apiRequest<{ archived: boolean }>(`/contracts/${id}/archive`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
function clean<T extends object>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined),
  );
}
