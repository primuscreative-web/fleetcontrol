import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { validateEnv } from "./common/config/env.validation";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { OriginGuard } from "./common/guards/origin.guard";
import { RbacGuard } from "./common/guards/rbac.guard";
import { HttpAuditInterceptor } from "./common/interceptors/http-audit.interceptor";
import { RequestContextInterceptor } from "./common/interceptors/request-context.interceptor";
import { RequestLoggerInterceptor } from "./common/interceptors/request-logger.interceptor";
import { StructuredLogger } from "./common/logging/structured-logger.service";
import { AccessControlModule } from "./modules/access-control/access-control.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RedisCacheModule } from "./modules/cache/cache.module";
import { EventsModule } from "./modules/events/events.module";
import { DriversModule } from "./modules/drivers/drivers.module";
import { ContractsModule } from "./modules/contracts/contracts.module";
import { FeatureFlagsModule } from "./modules/feature-flags/feature-flags.module";
import { FleetModule } from "./modules/fleet/fleet.module";
import { FuelModule } from "./modules/fuel/fuel.module";
import { HealthModule } from "./modules/health/health.module";
import { MailModule } from "./modules/mail/mail.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { StorageModule } from "./modules/storage/storage.module";
import { TenancyModule } from "./modules/tenancy/tenancy.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./shared/infrastructure/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60_000,
    }),
    JwtModule.register({}),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    RedisCacheModule,
    AuditModule,
    EventsModule,
    StorageModule,
    AuthModule,
    AccessControlModule,
    TenancyModule,
    UsersModule,
    SettingsModule,
    FeatureFlagsModule,
    FleetModule,
    DriversModule,
    ContractsModule,
    FuelModule,
    MailModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [
    StructuredLogger,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: OriginGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpAuditInterceptor,
    },
  ],
})
export class AppModule {}
