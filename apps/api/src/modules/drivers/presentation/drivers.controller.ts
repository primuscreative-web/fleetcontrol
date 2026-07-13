import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { RequestPrincipal, RequestWithContext } from "../../../common/context/request-context";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { DriversService } from "../application/drivers.service";
import {
  ArchiveDriverDto,
  AssignVehicleDto,
  ChangeDriverStatusDto,
  CreateDriverDocumentDto,
  CreateDriverDto,
  ListDriversQueryDto,
  UnassignVehicleDto,
  UpdateDriverDto,
} from "./drivers.dto";

@ApiBearerAuth()
@ApiTags("drivers")
@Controller("drivers")
export class DriversController {
  constructor(private readonly service: DriversService) {}

  @Get()
  @RequirePermissions(permissions.drivers.read)
  list(@CurrentUser() user: RequestPrincipal, @Query() query: ListDriversQueryDto) {
    return this.service.list(user, query);
  }

  @Get("dashboard")
  @RequirePermissions(permissions.drivers.read)
  dashboard(@CurrentUser() user: RequestPrincipal) {
    return this.service.dashboard(user);
  }

  @Get("options")
  @RequirePermissions(permissions.drivers.read)
  options(@CurrentUser() user: RequestPrincipal) {
    return this.service.options(user);
  }

  @Post()
  @RequirePermissions(permissions.drivers.manage)
  create(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateDriverDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.create(user, body, request.device);
  }

  @Get(":id")
  @RequirePermissions(permissions.drivers.read)
  get(@CurrentUser() user: RequestPrincipal, @Param("id") id: string) {
    return this.service.get(user, id);
  }

  @Patch(":id")
  @RequirePermissions(permissions.drivers.manage)
  update(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: UpdateDriverDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.update(user, id, body, request.device);
  }

  @Patch(":id/status")
  @RequirePermissions(permissions.drivers.manage)
  changeStatus(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ChangeDriverStatusDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.changeStatus(user, id, body, request.device);
  }

  @Post(":id/assignments")
  @RequirePermissions(permissions.drivers.assign)
  assign(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: AssignVehicleDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.assignVehicle(user, id, body, request.device);
  }

  @Patch(":id/assignments/:assignmentId/end")
  @RequirePermissions(permissions.drivers.assign)
  unassign(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Param("assignmentId") assignmentId: string,
    @Body() body: UnassignVehicleDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.unassignVehicle(user, id, assignmentId, body, request.device);
  }

  @Post(":id/documents")
  @RequirePermissions(permissions.drivers.documents)
  addDocument(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: CreateDriverDocumentDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.addDocument(user, id, body, request.device);
  }

  @Post(":id/archive")
  @RequirePermissions(permissions.drivers.archive)
  archive(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ArchiveDriverDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.archive(user, id, body, request.device);
  }
}
