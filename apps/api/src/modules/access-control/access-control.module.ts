import { Module } from "@nestjs/common";

import { EventsModule } from "../events/events.module";
import { AccessControlSeeder } from "./application/access-control-seeder.service";
import { AccessControlService } from "./application/access-control.service";
import { AccessControlController } from "./presentation/access-control.controller";

@Module({
  imports: [EventsModule],
  controllers: [AccessControlController],
  providers: [AccessControlService, AccessControlSeeder],
})
export class AccessControlModule {}
