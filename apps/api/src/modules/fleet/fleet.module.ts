import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { FLEET_REPOSITORY } from "./application/fleet.repository";
import { FleetService } from "./application/fleet.service";
import { PrismaFleetRepository } from "./infrastructure/prisma-fleet.repository";
import { FleetController } from "./presentation/fleet.controller";

@Module({
  imports: [AuditModule, EventsModule, NotificationsModule],
  controllers: [FleetController],
  providers: [
    FleetService,
    {
      provide: FLEET_REPOSITORY,
      useClass: PrismaFleetRepository,
    },
  ],
  exports: [FleetService],
})
export class FleetModule {}
