import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DRIVERS_REPOSITORY } from "./application/drivers.repository";
import { DriversService } from "./application/drivers.service";
import { PrismaDriversRepository } from "./infrastructure/prisma-drivers.repository";
import { DriversController } from "./presentation/drivers.controller";

@Module({
  imports: [AuditModule, EventsModule, NotificationsModule],
  controllers: [DriversController],
  providers: [DriversService, { provide: DRIVERS_REPOSITORY, useClass: PrismaDriversRepository }],
  exports: [DriversService],
})
export class DriversModule {}
