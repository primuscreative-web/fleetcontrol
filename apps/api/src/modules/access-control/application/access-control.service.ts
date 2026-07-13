import { Injectable } from "@nestjs/common";
import type { Prisma } from "@fleetcontrol/database";

import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { EventBusService } from "../../events/application/event-bus.service";

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBusService,
  ) {}

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: "asc" }, { action: "asc" }] });
  }

  listRoles(companyId?: string) {
    return this.prisma.role.findMany({
      where: { companyId },
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: "asc" },
    });
  }

  createRole(input: { companyId?: string; key: string; name: string; description?: string }) {
    return this.prisma.role.create({
      data: {
        ...input,
        scopeId: input.companyId ?? "system",
      },
    });
  }

  async assignPermission(input: {
    roleId: string;
    permissionId: string;
    companyId?: string;
    conditions?: Prisma.InputJsonValue;
  }) {
    const rolePermission = await this.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: input.roleId,
          permissionId: input.permissionId,
        },
      },
      update: { conditions: input.conditions },
      create: {
        roleId: input.roleId,
        permissionId: input.permissionId,
        conditions: input.conditions,
      },
    });

    await this.events.publish({
      name: "RoleUpdated",
      aggregateType: "Role",
      aggregateId: input.roleId,
      companyId: input.companyId,
      payload: { permissionId: input.permissionId },
    });

    return rolePermission;
  }
}
