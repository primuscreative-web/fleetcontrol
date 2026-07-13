import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CONTRACTS_REPOSITORY } from "./application/contracts.repository";
import { ContractsService } from "./application/contracts.service";
import { PrismaContractsRepository } from "./infrastructure/prisma-contracts.repository";
import { ContractsController } from "./presentation/contracts.controller";
@Module({
  imports: [AuditModule, EventsModule, NotificationsModule],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    { provide: CONTRACTS_REPOSITORY, useClass: PrismaContractsRepository },
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
