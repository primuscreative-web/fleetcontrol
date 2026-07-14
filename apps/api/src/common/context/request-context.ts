import type { Role } from "@fleetcontrol/authz";

export interface RequestPrincipal {
  userId: string;
  companyId: string;
  sessionId: string;
  role: Role;
  branchId?: string;
  departmentId?: string;
}

export interface RequestDevice {
  ipAddress?: string;
  userAgent?: string;
  browser?: string;
  operatingSystem?: string;
  device?: string;
}

export interface RequestWithContext {
  method: string;
  url: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  body?: Record<string, any>;
  user?: RequestPrincipal;
  device?: RequestDevice;
}
