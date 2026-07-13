import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuditModule } from "../audit/audit.module";
import { RedisCacheModule } from "../cache/cache.module";
import { EventsModule } from "../events/events.module";
import { MailModule } from "../mail/mail.module";
import { AuthService } from "./application/auth.service";
import { AuthController } from "./presentation/auth.controller";

@Module({
  imports: [JwtModule.register({}), RedisCacheModule, AuditModule, EventsModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
