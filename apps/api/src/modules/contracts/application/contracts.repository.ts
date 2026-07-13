import type { ContractStatus, ContractType, Prisma } from "@fleetcontrol/database";
export interface ContractListFilters {
  companyId: string;
  branchId?: string;
  search?: string;
  status?: ContractStatus;
  type?: ContractType;
  page: number;
  pageSize: number;
}
export interface ContractsRepository {
  list(filters: ContractListFilters): Promise<{ data: unknown[]; total: number }>;
  findById(companyId: string, id: string): Promise<unknown | null>;
  create(data: Prisma.ContractCreateInput): Promise<unknown>;
  update(companyId: string, id: string, data: Prisma.ContractUpdateInput): Promise<unknown>;
}
export const CONTRACTS_REPOSITORY = Symbol("CONTRACTS_REPOSITORY");
