import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { AccessControlService } from "../application/access-control.service";
import { AssignPermissionDto, CreateRoleDto } from "./access-control.dto";

@ApiBearerAuth()
@ApiTags("access-control")
@Controller("access-control")
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get("permissions")
  @RequirePermissions(permissions.roles.read)
  listPermissions() {
    return this.accessControlService.listPermissions();
  }

  @Get("roles")
  @RequirePermissions(permissions.roles.read)
  listRoles(@Query("companyId") companyId?: string) {
    return this.accessControlService.listRoles(companyId);
  }

  @Post("roles")
  @RequirePermissions(permissions.roles.manage)
  createRole(@Body() body: CreateRoleDto) {
    return this.accessControlService.createRole(body);
  }

  @Post("roles/:roleId/permissions")
  @RequirePermissions(permissions.roles.manage)
  assignPermission(@Param("roleId") roleId: string, @Body() body: AssignPermissionDto) {
    return this.accessControlService.assignPermission({ ...body, roleId });
  }
}
