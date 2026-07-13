import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { EventsModule } from "../events/events.module";
import { UsersService } from "./application/users.service";
import { UsersController } from "./presentation/users.controller";

@Module({
  imports: [AuditModule, EventsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
