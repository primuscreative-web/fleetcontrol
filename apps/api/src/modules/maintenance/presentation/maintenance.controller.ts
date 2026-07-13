import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { RequestPrincipal, RequestWithContext } from "../../../common/context/request-context";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { MaintenanceService } from "../application/maintenance.service";
import {
  CompleteMaintenanceDto,
  CreateMaintenanceOrderDto,
  CreateMaintenancePlanDto,
  ListMaintenanceOrdersQueryDto,
  ReviewMaintenanceDto,
  StartMaintenanceDto,
} from "./maintenance.dto";
@ApiBearerAuth()
@ApiTags("maintenance")
@Controller("maintenance")
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}
  @Get() @RequirePermissions(permissions.maintenance.read) list(
    @CurrentUser() user: RequestPrincipal,
    @Query() query: ListMaintenanceOrdersQueryDto,
  ) {
    return this.service.list(user, query);
  }
  @Get("dashboard") @RequirePermissions(permissions.maintenance.read) dashboard(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.dashboard(user);
  }
  @Get("options") @RequirePermissions(permissions.maintenance.read) options(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.options(user);
  }
  @Get("plans") @RequirePermissions(permissions.maintenance.read) plans(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.plans(user);
  }
  @Post("plans") @RequirePermissions(permissions.maintenance.plans) createPlan(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateMaintenancePlanDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.createPlan(user, body, request.device);
  }
  @Post() @RequirePermissions(permissions.maintenance.manage) create(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateMaintenanceOrderDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.create(user, body, request.device);
  }
  @Get(":id") @RequirePermissions(permissions.maintenance.read) get(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
  ) {
    return this.service.get(user, id);
  }
  @Patch(":id/approve") @RequirePermissions(permissions.maintenance.approve) approve(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ReviewMaintenanceDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.approve(user, id, body, request.device);
  }
  @Patch(":id/reject") @RequirePermissions(permissions.maintenance.approve) reject(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ReviewMaintenanceDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.reject(user, id, body, request.device);
  }
  @Patch(":id/start") @RequirePermissions(permissions.maintenance.manage) start(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: StartMaintenanceDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.start(user, id, body, request.device);
  }
  @Patch(":id/complete") @RequirePermissions(permissions.maintenance.complete) complete(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: CompleteMaintenanceDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.complete(user, id, body, request.device);
  }
}
