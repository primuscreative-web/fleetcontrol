import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { RequestPrincipal, RequestWithContext } from "../../../common/context/request-context";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { TiresService } from "../application/tires.service";
import {
  CompleteRetreadDto,
  CreateTireDto,
  InspectTireDto,
  InstallTireDto,
  ListTiresQueryDto,
  RemoveTireDto,
  RequestRetreadDto,
  RotateTireDto,
  ScrapTireDto,
} from "./tires.dto";
@ApiBearerAuth()
@ApiTags("tires")
@Controller("tires")
export class TiresController {
  constructor(private readonly service: TiresService) {}
  @Get() @RequirePermissions(permissions.tires.read) list(
    @CurrentUser() user: RequestPrincipal,
    @Query() query: ListTiresQueryDto,
  ) {
    return this.service.list(user, query);
  }
  @Get("dashboard") @RequirePermissions(permissions.tires.read) dashboard(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.dashboard(user);
  }
  @Get("options") @RequirePermissions(permissions.tires.read) options(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.options(user);
  }
  @Post() @RequirePermissions(permissions.tires.manage) create(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateTireDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.create(user, body, request.device);
  }
  @Get(":id") @RequirePermissions(permissions.tires.read) get(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
  ) {
    return this.service.get(user, id);
  }
  @Patch(":id/install") @RequirePermissions(permissions.tires.move) install(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: InstallTireDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.install(user, id, body, request.device);
  }
  @Patch(":id/remove") @RequirePermissions(permissions.tires.move) remove(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: RemoveTireDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.remove(user, id, body, request.device);
  }
  @Patch(":id/rotate") @RequirePermissions(permissions.tires.move) rotate(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: RotateTireDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.rotate(user, id, body, request.device);
  }
  @Post(":id/inspections") @RequirePermissions(permissions.tires.inspect) inspect(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: InspectTireDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.inspect(user, id, body, request.device);
  }
  @Post(":id/retreads") @RequirePermissions(permissions.tires.retread) retread(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: RequestRetreadDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.requestRetread(user, id, body, request.device);
  }
  @Patch(":id/retreads/:retreadId/complete")
  @RequirePermissions(permissions.tires.retread)
  completeRetread(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Param("retreadId") retreadId: string,
    @Body() body: CompleteRetreadDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.completeRetread(user, id, retreadId, body, request.device);
  }
  @Patch(":id/scrap") @RequirePermissions(permissions.tires.scrap) scrap(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ScrapTireDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.scrap(user, id, body, request.device);
  }
}
