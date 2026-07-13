import { Module } from "@nestjs/common";

import { RedisCacheModule } from "../cache/cache.module";
import { SettingsService } from "./application/settings.service";
import { SettingsController } from "./presentation/settings.controller";

@Module({
  imports: [RedisCacheModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
