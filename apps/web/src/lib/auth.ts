import type { Permission, Role } from "@fleetcontrol/authz";
import { hasPermission } from "@fleetcontrol/authz";

import { apiRequest } from "./api-client";

export interface AuthProfile {
  id: string;
  name: string;
  email: string;
  role?: {
    key: Role;
    name: string;
  };
  company?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    defaultLanguage: string;
    defaultTimezone: string;
    defaultCurrency: string;
  };
  branch?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
  scope: {
    companyId?: string;
    branchId?: string;
    departmentId?: string;
  };
}

export interface SignInInput {
  email: string;
  password: string;
  companyId?: string;
  rememberMe: boolean;
}

export function signIn(input: SignInInput) {
  return apiRequest<{ authenticated: true }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function signOut() {
  return apiRequest<{ loggedOut: true }>("/auth/logout", { method: "POST" });
}

export function getProfile() {
  return apiRequest<AuthProfile>("/auth/me");
}

export function canAccess(profile: AuthProfile | null | undefined, permission?: Permission) {
  if (!permission) {
    return Boolean(profile);
  }

  return Boolean(profile?.role?.key && hasPermission(profile.role.key, permission));
}
