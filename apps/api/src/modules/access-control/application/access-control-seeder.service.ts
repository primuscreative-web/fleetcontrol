import { permissions, roles } from "@fleetcontrol/authz";
import { Injectable, OnModuleInit } from "@nestjs/common";

import { PrismaService } from "../../../shared/infrastructure/prisma.service";

@Injectable()
export class AccessControlSeeder implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const permissionEntries = Object.values(permissions).flatMap((group) =>
      Object.values(group).map((permission) => {
        const [resource, action] = permission.split(":");
        return { resource, action };
      }),
    );

    for (const permission of permissionEntries) {
      await this.prisma.permission.upsert({
        where: {
          resource_action: permission,
        },
        update: {},
        create: permission,
      });
    }

    for (const [key, rolePermissions] of Object.entries(roles)) {
      const role = await this.prisma.role.upsert({
        where: {
          scopeId_key: {
            scopeId: "system",
            key,
          },
        },
        update: { name: this.toLabel(key) },
        create: {
          scopeId: "system",
          key,
          name: this.toLabel(key),
        },
      });

      for (const permission of rolePermissions) {
        const [resource, action] = permission.split(":");
        const permissionRecord = await this.prisma.permission.findUniqueOrThrow({
          where: {
            resource_action: { resource, action },
          },
        });

        await this.prisma.rolePermission.upsert({
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

  private toLabel(value: string): string {
    return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
  }
}
