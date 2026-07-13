import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import type { RequestPrincipal } from "../../../common/context/request-context";
import { UsersService } from "../application/users.service";
import { CreateUserDto } from "./users.dto";

@ApiBearerAuth()
@ApiTags("users")
@Controller("companies/:companyId/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(permissions.users.read)
  list(@Param("companyId") companyId: string) {
    return this.usersService.list(companyId);
  }

  @Post()
  @RequirePermissions(permissions.users.manage)
  create(
    @CurrentUser() user: RequestPrincipal,
    @Param("companyId") companyId: string,
    @Body() body: CreateUserDto,
  ) {
    return this.usersService.create({ ...body, companyId, actorId: user.userId });
  }
}
