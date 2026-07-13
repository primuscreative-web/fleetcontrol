import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { FUEL_REPOSITORY } from "./application/fuel.repository";
import { FuelService } from "./application/fuel.service";
import { PrismaFuelRepository } from "./infrastructure/prisma-fuel.repository";
import { FuelController } from "./presentation/fuel.controller";

@Module({
  imports: [AuditModule, EventsModule, NotificationsModule],
  controllers: [FuelController],
  providers: [FuelService, { provide: FUEL_REPOSITORY, useClass: PrismaFuelRepository }],
  exports: [FuelService],
})
export class FuelModule {}
