import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MAINTENANCE_REPOSITORY } from "./application/maintenance.repository";
import { MaintenanceService } from "./application/maintenance.service";
import { PrismaMaintenanceRepository } from "./infrastructure/prisma-maintenance.repository";
import { MaintenanceController } from "./presentation/maintenance.controller";
@Module({
  imports: [AuditModule, EventsModule, NotificationsModule],
  controllers: [MaintenanceController],
  providers: [
    MaintenanceService,
    { provide: MAINTENANCE_REPOSITORY, useClass: PrismaMaintenanceRepository },
  ],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
