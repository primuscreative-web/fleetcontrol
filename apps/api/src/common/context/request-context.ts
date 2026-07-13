import type { Role } from "@fleetcontrol/authz";
import type { Request } from "express";

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

export interface RequestWithContext extends Request {
  user?: RequestPrincipal;
  device?: RequestDevice;
}
