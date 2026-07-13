import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SUPPLY_CHAIN_REPOSITORY } from "./application/supply-chain.repository";
import { SupplyChainService } from "./application/supply-chain.service";
import { PrismaSupplyChainRepository } from "./infrastructure/prisma-supply-chain.repository";
import { SupplyChainController } from "./presentation/supply-chain.controller";
@Module({
  imports: [AuditModule, EventsModule, NotificationsModule],
  controllers: [SupplyChainController],
  providers: [
    SupplyChainService,
    { provide: SUPPLY_CHAIN_REPOSITORY, useClass: PrismaSupplyChainRepository },
  ],
  exports: [SupplyChainService],
})
export class SupplyChainModule {}
