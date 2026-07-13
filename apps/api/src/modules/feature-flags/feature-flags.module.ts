import { Module } from "@nestjs/common";

import { RedisCacheModule } from "../cache/cache.module";
import { FeatureFlagsService } from "./application/feature-flags.service";
import { FeatureFlagsController } from "./presentation/feature-flags.controller";

@Module({
  imports: [RedisCacheModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
