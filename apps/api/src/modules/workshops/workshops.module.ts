import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WORKSHOPS_REPOSITORY } from "./application/workshops.repository";
import { WorkshopsService } from "./application/workshops.service";
import { PrismaWorkshopsRepository } from "./infrastructure/prisma-workshops.repository";
import { WorkshopsController } from "./presentation/workshops.controller";
@Module({
  imports: [AuditModule, EventsModule, NotificationsModule],
  controllers: [WorkshopsController],
  providers: [
    WorkshopsService,
    { provide: WORKSHOPS_REPOSITORY, useClass: PrismaWorkshopsRepository },
  ],
  exports: [WorkshopsService],
})
export class WorkshopsModule {}
