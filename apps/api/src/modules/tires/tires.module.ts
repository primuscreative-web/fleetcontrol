import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { TIRES_REPOSITORY } from "./application/tires.repository";
import { TiresService } from "./application/tires.service";
import { PrismaTiresRepository } from "./infrastructure/prisma-tires.repository";
import { TiresController } from "./presentation/tires.controller";
@Module({
  imports: [AuditModule, EventsModule, NotificationsModule],
  controllers: [TiresController],
  providers: [TiresService, { provide: TIRES_REPOSITORY, useClass: PrismaTiresRepository }],
  exports: [TiresService],
})
export class TiresModule {}
