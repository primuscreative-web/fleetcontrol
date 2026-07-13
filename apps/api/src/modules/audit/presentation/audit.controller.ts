import { permissions } from "@fleetcontrol/authz";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";

@ApiBearerAuth()
@ApiTags("audit")
@Controller("audit")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(permissions.audit.read)
  list(@Query("companyId") companyId?: string) {
    return this.prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}
