import { permissions } from "@fleetcontrol/authz";
import type { Prisma } from "@fleetcontrol/database";
import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { SettingsService } from "../application/settings.service";

@ApiBearerAuth()
@ApiTags("settings")
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(":scope/:key")
  @RequirePermissions(permissions.settings.read)
  get(
    @Param("scope") scope: string,
    @Param("key") key: string,
    @Query("companyId") companyId?: string,
  ) {
    return this.settingsService.get(companyId, scope, key);
  }

  @Put(":scope/:key")
  @RequirePermissions(permissions.settings.manage)
  upsert(
    @Param("scope") scope: string,
    @Param("key") key: string,
    @Body() body: Prisma.InputJsonObject,
    @Query("companyId") companyId?: string,
  ) {
    return this.settingsService.upsert(companyId, scope, key, body);
  }
}
