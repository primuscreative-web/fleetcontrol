import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { RequestPrincipal, RequestWithContext } from "../../../common/context/request-context";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { FuelService } from "../application/fuel.service";
import {
  CreateFuelingDto,
  CreateFuelPriceDto,
  CreateFuelStationDto,
  ListFuelingsQueryDto,
  ReviewFuelingDto,
} from "./fuel.dto";

@ApiBearerAuth()
@ApiTags("fuel")
@Controller("fuel")
export class FuelController {
  constructor(private readonly service: FuelService) {}
  @Get() @RequirePermissions(permissions.fuel.read) list(
    @CurrentUser() user: RequestPrincipal,
    @Query() query: ListFuelingsQueryDto,
  ) {
    return this.service.list(user, query);
  }
  @Get("dashboard") @RequirePermissions(permissions.fuel.read) dashboard(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.dashboard(user);
  }
  @Get("options") @RequirePermissions(permissions.fuel.read) options(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.options(user);
  }
  @Get("stations") @RequirePermissions(permissions.fuel.read) stations(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.stations(user);
  }
  @Post("stations") @RequirePermissions(permissions.fuel.stations) createStation(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateFuelStationDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.createStation(user, body, request.device);
  }
  @Post("stations/:id/prices") @RequirePermissions(permissions.fuel.stations) addPrice(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: CreateFuelPriceDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.addPrice(user, id, body, request.device);
  }
  @Post() @RequirePermissions(permissions.fuel.manage) create(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateFuelingDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.createFueling(user, body, request.device);
  }
  @Patch(":id/approve") @RequirePermissions(permissions.fuel.approve) approve(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ReviewFuelingDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.approve(user, id, body, request.device);
  }
  @Patch(":id/reject") @RequirePermissions(permissions.fuel.approve) reject(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ReviewFuelingDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.reject(user, id, body, request.device);
  }
}
