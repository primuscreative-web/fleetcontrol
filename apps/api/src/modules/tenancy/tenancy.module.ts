import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { TenancyService } from "./application/tenancy.service";
import { TenancyController } from "./presentation/tenancy.controller";

@Module({
  imports: [AuditModule, EventsModule],
  controllers: [TenancyController],
  providers: [TenancyService],
  exports: [TenancyService],
})
export class TenancyModule {}
