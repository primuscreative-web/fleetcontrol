import * as argon2 from "argon2";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const systemRoles = {
  globalAdmin: "Administrador Global",
  companyAdmin: "Administrador Empresa",
  director: "Diretor",
  manager: "Gerente",
  supervisor: "Supervisor",
  finance: "Financeiro",
  purchasing: "Compras",
  operator: "Operador",
  driver: "Motorista",
  viewer: "Visualizador",
} as const;

const permissions = [
  ["platform", "read"],
  ["platform", "manage"],
  ["company", "read"],
  ["company", "manage"],
  ["branches", "read"],
  ["branches", "manage"],
  ["departments", "read"],
  ["departments", "manage"],
  ["users", "read"],
  ["users", "manage"],
  ["roles", "read"],
  ["roles", "manage"],
  ["settings", "read"],
  ["settings", "manage"],
  ["notifications", "read"],
  ["notifications", "manage"],
  ["feature_flags", "read"],
  ["feature_flags", "manage"],
  ["audit", "read"],
  ["fleet", "read"],
  ["fleet", "manage"],
  ["fleet", "transfer"],
  ["fleet", "archive"],
  ["fleet", "documents"],
  ["fleet", "photos"],
  ["fleet", "costs"],
  ["drivers", "read"],
  ["drivers", "manage"],
  ["drivers", "assign"],
  ["drivers", "documents"],
  ["drivers", "archive"],
  ["contracts", "read"],
  ["contracts", "manage"],
  ["contracts", "amend"],
  ["contracts", "allocate"],
  ["contracts", "documents"],
  ["contracts", "archive"],
  ["fuel", "read"],
  ["fuel", "manage"],
  ["fuel", "approve"],
  ["fuel", "stations"],
  ["fuel", "import"],
  ["maintenance", "read"],
  ["maintenance", "manage"],
  ["maintenance", "approve"],
  ["maintenance", "plans"],
  ["maintenance", "complete"],
] as const;

const rolePermissions: Record<keyof typeof systemRoles, string[]> = {
  globalAdmin: permissions.map(([resource, action]) => `${resource}:${action}`),
  companyAdmin: [
    "company:read",
    "company:manage",
    "branches:read",
    "branches:manage",
    "departments:read",
    "departments:manage",
    "users:read",
    "users:manage",
    "roles:read",
    "roles:manage",
    "settings:read",
    "settings:manage",
    "notifications:read",
    "notifications:manage",
    "feature_flags:read",
    "audit:read",
    "fleet:read",
    "fleet:manage",
    "fleet:transfer",
    "fleet:archive",
    "fleet:documents",
    "fleet:photos",
    "fleet:costs",
    "drivers:read",
    "drivers:manage",
    "drivers:assign",
    "drivers:documents",
    "drivers:archive",
    "contracts:read",
    "contracts:manage",
    "contracts:amend",
    "contracts:allocate",
    "contracts:documents",
    "contracts:archive",
    "fuel:read",
    "fuel:manage",
    "fuel:approve",
    "fuel:stations",
    "fuel:import",
    "maintenance:read",
    "maintenance:manage",
    "maintenance:approve",
    "maintenance:plans",
    "maintenance:complete",
  ],
  director: [
    "company:read",
    "branches:read",
    "departments:read",
    "users:read",
    "settings:read",
    "notifications:read",
    "audit:read",
    "fleet:read",
    "fleet:costs",
    "drivers:read",
    "contracts:read",
    "fuel:read",
    "maintenance:read",
  ],
  manager: [
    "company:read",
    "branches:read",
    "departments:read",
    "users:read",
    "settings:read",
    "notifications:read",
    "fleet:read",
    "fleet:manage",
    "fleet:transfer",
    "fleet:documents",
    "fleet:photos",
    "fleet:costs",
    "drivers:read",
    "drivers:manage",
    "drivers:assign",
    "drivers:documents",
    "contracts:read",
    "contracts:manage",
    "contracts:amend",
    "contracts:allocate",
    "contracts:documents",
    "fuel:read",
    "fuel:manage",
    "fuel:approve",
    "fuel:stations",
    "fuel:import",
    "maintenance:read",
    "maintenance:manage",
    "maintenance:approve",
    "maintenance:plans",
    "maintenance:complete",
  ],
  supervisor: [
    "company:read",
    "branches:read",
    "departments:read",
    "users:read",
    "notifications:read",
    "fleet:read",
    "fleet:manage",
    "fleet:documents",
    "fleet:photos",
    "drivers:read",
    "drivers:manage",
    "drivers:assign",
    "drivers:documents",
    "contracts:read",
    "contracts:manage",
    "contracts:allocate",
    "contracts:documents",
    "fuel:read",
    "fuel:manage",
    "fuel:approve",
    "fuel:stations",
    "maintenance:read",
    "maintenance:manage",
    "maintenance:approve",
    "maintenance:plans",
    "maintenance:complete",
  ],
  finance: [
    "company:read",
    "notifications:read",
    "fleet:read",
    "fleet:costs",
    "contracts:read",
    "fuel:read",
    "fuel:approve",
    "maintenance:read",
    "maintenance:approve",
  ],
  purchasing: [
    "company:read",
    "notifications:read",
    "fleet:read",
    "fleet:documents",
    "fleet:costs",
    "contracts:read",
    "contracts:manage",
    "contracts:amend",
    "contracts:documents",
    "fuel:read",
    "fuel:stations",
    "maintenance:read",
  ],
  operator: [
    "company:read",
    "notifications:read",
    "fleet:read",
    "fleet:manage",
    "fleet:documents",
    "fleet:photos",
    "drivers:read",
    "drivers:manage",
    "drivers:documents",
    "contracts:read",
    "contracts:allocate",
    "contracts:documents",
    "fuel:read",
    "fuel:manage",
    "maintenance:read",
    "maintenance:manage",
    "maintenance:complete",
  ],
  driver: ["company:read", "notifications:read", "fleet:read"],
  viewer: ["company:read", "notifications:read", "fleet:read"],
};

async function main() {
  await seedPermissionsAndRoles();
  await bootstrapGlobalAdmin();
  await seedTestAccount();
}

async function seedPermissionsAndRoles() {
  for (const [resource, action] of permissions) {
    await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: { resource, action },
    });
  }

  for (const [key, name] of Object.entries(systemRoles)) {
    const role = await prisma.role.upsert({
      where: { scopeId_key: { scopeId: "system", key } },
      update: { name },
      create: { scopeId: "system", key, name },
    });

    for (const permission of rolePermissions[key as keyof typeof systemRoles]) {
      const [resource, action] = permission.split(":");
      const permissionRecord = await prisma.permission.findUniqueOrThrow({
        where: { resource_action: { resource, action } },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permissionRecord.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permissionRecord.id,
        },
      });
    }
  }
}

async function bootstrapGlobalAdmin() {
  const companyName = process.env.BOOTSTRAP_COMPANY_NAME;
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME;
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!companyName || !adminName || !adminEmail || !adminPassword) {
    return;
  }

  if (adminPassword.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must have at least 12 characters.");
  }

  const normalizedEmail = adminEmail.toLowerCase();
  const company = await prisma.company.upsert({
    where: { document: `bootstrap:${normalizedEmail}` },
    update: { name: companyName },
    create: {
      name: companyName,
      document: `bootstrap:${normalizedEmail}`,
    },
  });
  const role = await prisma.role.findUniqueOrThrow({
    where: { scopeId_key: { scopeId: "system", key: "globalAdmin" } },
  });
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { name: adminName },
    create: {
      name: adminName,
      email: normalizedEmail,
      passwordHash: await argon2.hash(adminPassword),
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: user.id,
      },
    },
    update: {
      roleId: role.id,
      status: "ACTIVE",
    },
    create: {
      companyId: company.id,
      userId: user.id,
      roleId: role.id,
      status: "ACTIVE",
    },
  });
}

async function seedTestAccount() {
  if (process.env.ENABLE_TEST_ACCOUNT !== "true") {
    return;
  }

  const companyName = process.env.TEST_ACCOUNT_COMPANY_NAME ?? "FleetControl Test Company";
  const adminName = process.env.TEST_ACCOUNT_ADMIN_NAME ?? "Conta Teste FleetControl";
  const adminEmail = (
    process.env.TEST_ACCOUNT_ADMIN_EMAIL ?? "teste@fleetcontrol.local"
  ).toLowerCase();
  const adminPassword = process.env.TEST_ACCOUNT_ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error("TEST_ACCOUNT_ADMIN_PASSWORD is required when ENABLE_TEST_ACCOUNT=true.");
  }

  if (adminPassword.length < 12) {
    throw new Error("TEST_ACCOUNT_ADMIN_PASSWORD must have at least 12 characters.");
  }

  const company = await prisma.company.upsert({
    where: { document: `test:${adminEmail}` },
    update: { name: companyName, status: "ACTIVE" },
    create: {
      name: companyName,
      legalName: companyName,
      document: `test:${adminEmail}`,
      status: "ACTIVE",
    },
  });
  const role = await prisma.role.findUniqueOrThrow({
    where: { scopeId_key: { scopeId: "system", key: "globalAdmin" } },
  });
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: await argon2.hash(adminPassword),
      emailVerifiedAt: new Date(),
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword),
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: user.id,
      },
    },
    update: {
      roleId: role.id,
      status: "ACTIVE",
    },
    create: {
      companyId: company.id,
      userId: user.id,
      roleId: role.id,
      status: "ACTIVE",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
