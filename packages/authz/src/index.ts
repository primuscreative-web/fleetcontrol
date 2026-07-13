export const permissions = {
  platform: {
    read: "platform:read",
    manage: "platform:manage",
  },
  company: {
    read: "company:read",
    manage: "company:manage",
  },
  branches: {
    read: "branches:read",
    manage: "branches:manage",
  },
  departments: {
    read: "departments:read",
    manage: "departments:manage",
  },
  users: {
    read: "users:read",
    manage: "users:manage",
  },
  roles: {
    read: "roles:read",
    manage: "roles:manage",
  },
  settings: {
    read: "settings:read",
    manage: "settings:manage",
  },
  notifications: {
    read: "notifications:read",
    manage: "notifications:manage",
  },
  featureFlags: {
    read: "feature_flags:read",
    manage: "feature_flags:manage",
  },
  audit: {
    read: "audit:read",
  },
  fleet: {
    read: "fleet:read",
    manage: "fleet:manage",
    transfer: "fleet:transfer",
    archive: "fleet:archive",
    documents: "fleet:documents",
    photos: "fleet:photos",
    costs: "fleet:costs",
  },
  drivers: {
    read: "drivers:read",
    manage: "drivers:manage",
    assign: "drivers:assign",
    documents: "drivers:documents",
    archive: "drivers:archive",
  },
  contracts: {
    read: "contracts:read",
    manage: "contracts:manage",
    amend: "contracts:amend",
    allocate: "contracts:allocate",
    documents: "contracts:documents",
    archive: "contracts:archive",
  },
} as const;

type PermissionValue<T> = T extends Record<string, infer TValue> ? TValue : never;
export type Permission = PermissionValue<(typeof permissions)[keyof typeof permissions]>;

export const roles = {
  globalAdmin: [
    permissions.platform.read,
    permissions.platform.manage,
    permissions.company.read,
    permissions.company.manage,
    permissions.branches.read,
    permissions.branches.manage,
    permissions.departments.read,
    permissions.departments.manage,
    permissions.users.read,
    permissions.users.manage,
    permissions.roles.read,
    permissions.roles.manage,
    permissions.settings.read,
    permissions.settings.manage,
    permissions.notifications.read,
    permissions.notifications.manage,
    permissions.featureFlags.read,
    permissions.featureFlags.manage,
    permissions.audit.read,
    permissions.fleet.read,
    permissions.fleet.manage,
    permissions.fleet.transfer,
    permissions.fleet.archive,
    permissions.fleet.documents,
    permissions.fleet.photos,
    permissions.fleet.costs,
    permissions.drivers.read,
    permissions.drivers.manage,
    permissions.drivers.assign,
    permissions.drivers.documents,
    permissions.drivers.archive,
    permissions.contracts.read,
    permissions.contracts.manage,
    permissions.contracts.amend,
    permissions.contracts.allocate,
    permissions.contracts.documents,
    permissions.contracts.archive,
  ],
  companyAdmin: [
    permissions.company.read,
    permissions.company.manage,
    permissions.branches.read,
    permissions.branches.manage,
    permissions.departments.read,
    permissions.departments.manage,
    permissions.users.read,
    permissions.users.manage,
    permissions.roles.read,
    permissions.roles.manage,
    permissions.settings.read,
    permissions.settings.manage,
    permissions.notifications.read,
    permissions.notifications.manage,
    permissions.featureFlags.read,
    permissions.audit.read,
    permissions.fleet.read,
    permissions.fleet.manage,
    permissions.fleet.transfer,
    permissions.fleet.archive,
    permissions.fleet.documents,
    permissions.fleet.photos,
    permissions.fleet.costs,
    permissions.drivers.read,
    permissions.drivers.manage,
    permissions.drivers.assign,
    permissions.drivers.documents,
    permissions.drivers.archive,
    permissions.contracts.read,
    permissions.contracts.manage,
    permissions.contracts.amend,
    permissions.contracts.allocate,
    permissions.contracts.documents,
    permissions.contracts.archive,
  ],
  director: [
    permissions.company.read,
    permissions.branches.read,
    permissions.departments.read,
    permissions.users.read,
    permissions.settings.read,
    permissions.notifications.read,
    permissions.audit.read,
    permissions.fleet.read,
    permissions.fleet.costs,
    permissions.drivers.read,
    permissions.contracts.read,
  ],
  manager: [
    permissions.company.read,
    permissions.branches.read,
    permissions.departments.read,
    permissions.users.read,
    permissions.settings.read,
    permissions.notifications.read,
    permissions.fleet.read,
    permissions.fleet.manage,
    permissions.fleet.transfer,
    permissions.fleet.documents,
    permissions.fleet.photos,
    permissions.fleet.costs,
    permissions.drivers.read,
    permissions.drivers.manage,
    permissions.drivers.assign,
    permissions.drivers.documents,
    permissions.contracts.read,
    permissions.contracts.manage,
    permissions.contracts.amend,
    permissions.contracts.allocate,
    permissions.contracts.documents,
  ],
  supervisor: [
    permissions.company.read,
    permissions.branches.read,
    permissions.departments.read,
    permissions.users.read,
    permissions.notifications.read,
    permissions.fleet.read,
    permissions.fleet.manage,
    permissions.fleet.documents,
    permissions.fleet.photos,
    permissions.drivers.read,
    permissions.drivers.manage,
    permissions.drivers.assign,
    permissions.drivers.documents,
    permissions.contracts.read,
    permissions.contracts.manage,
    permissions.contracts.allocate,
    permissions.contracts.documents,
  ],
  finance: [
    permissions.company.read,
    permissions.notifications.read,
    permissions.fleet.read,
    permissions.fleet.costs,
    permissions.contracts.read,
  ],
  purchasing: [
    permissions.company.read,
    permissions.notifications.read,
    permissions.fleet.read,
    permissions.fleet.documents,
    permissions.fleet.costs,
    permissions.contracts.read,
    permissions.contracts.manage,
    permissions.contracts.amend,
    permissions.contracts.documents,
  ],
  operator: [
    permissions.company.read,
    permissions.notifications.read,
    permissions.fleet.read,
    permissions.fleet.manage,
    permissions.fleet.documents,
    permissions.fleet.photos,
    permissions.drivers.read,
    permissions.drivers.manage,
    permissions.drivers.documents,
    permissions.contracts.read,
    permissions.contracts.allocate,
    permissions.contracts.documents,
  ],
  driver: [permissions.company.read, permissions.notifications.read, permissions.fleet.read],
  viewer: [permissions.company.read, permissions.notifications.read, permissions.fleet.read],
} as const satisfies Record<string, readonly Permission[]>;

export type Role = keyof typeof roles;

export interface AccessScope {
  companyId?: string;
  branchId?: string;
  departmentId?: string;
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return (roles[role] as readonly Permission[]).includes(permission);
}

export function isRole(value: string): value is Role {
  return value in roles;
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Role ${role} does not have permission ${permission}`);
  }
}

export function isWithinScope(required: AccessScope, granted: AccessScope): boolean {
  return (
    (!required.companyId || required.companyId === granted.companyId) &&
    (!required.branchId || required.branchId === granted.branchId) &&
    (!required.departmentId || required.departmentId === granted.departmentId)
  );
}
