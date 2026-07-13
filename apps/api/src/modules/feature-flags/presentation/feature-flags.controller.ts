import { permissions } from "@fleetcontrol/authz";
import type { Prisma } from "@fleetcontrol/database";
import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { FeatureFlagsService } from "../application/feature-flags.service";

class UpsertFeatureFlagDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  rules?: Prisma.InputJsonValue;
}

@ApiBearerAuth()
@ApiTags("feature-flags")
@Controller("feature-flags")
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get(":key")
  @RequirePermissions(permissions.featureFlags.read)
  isEnabled(@Param("key") key: string, @Query("companyId") companyId?: string) {
    return this.featureFlagsService.isEnabled(companyId, key);
  }

  @Put(":key")
  @RequirePermissions(permissions.featureFlags.manage)
  upsert(
    @Param("key") key: string,
    @Body() body: UpsertFeatureFlagDto,
    @Query("companyId") companyId?: string,
  ) {
    return this.featureFlagsService.upsert(
      companyId,
      key,
      body.enabled,
      body.description,
      body.rules,
    );
  }
}
