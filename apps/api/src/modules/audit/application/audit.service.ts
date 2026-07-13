import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { AuditEntry } from "../domain/audit-entry";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: entry.action,
        tableName: entry.tableName,
        recordId: entry.recordId,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        metadata: entry.metadata,
        actorId: entry.actorId,
        companyId: entry.companyId,
        ipAddress: entry.device?.ipAddress,
        userAgent: entry.device?.userAgent,
        browser: entry.device?.browser,
        operatingSystem: entry.device?.operatingSystem,
        device: entry.device?.device,
      },
    });
  }
}
