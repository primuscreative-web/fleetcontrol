import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import type { RequestPrincipal, RequestWithContext } from "../../../common/context/request-context";
import { FleetService } from "../application/fleet.service";
import {
  ArchiveVehicleDto,
  ChangeVehicleStatusDto,
  CreateFleetCatalogDto,
  CreateVehicleSavedFilterDto,
  CreateVehicleDocumentDto,
  CreateVehicleDto,
  CreateVehiclePhotoDto,
  ListVehiclesQueryDto,
  TransferVehicleDto,
  UpdateVehicleDto,
} from "./fleet.dto";

@ApiBearerAuth()
@ApiTags("fleet")
@Controller("fleet")
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get("vehicles")
  @RequirePermissions(permissions.fleet.read)
  listVehicles(@CurrentUser() user: RequestPrincipal, @Query() query: ListVehiclesQueryDto) {
    return this.fleetService.listVehicles(user, query);
  }

  @Get("vehicles/dashboard")
  @RequirePermissions(permissions.fleet.read)
  getDashboard(@CurrentUser() user: RequestPrincipal) {
    return this.fleetService.getDashboard(user);
  }

  @Get("vehicles/options")
  @RequirePermissions(permissions.fleet.read)
  getOptions(@CurrentUser() user: RequestPrincipal) {
    return this.fleetService.getOptions(user);
  }

  @Get("vehicles/saved-filters")
  @RequirePermissions(permissions.fleet.read)
  listSavedFilters(@CurrentUser() user: RequestPrincipal) {
    return this.fleetService.listSavedFilters(user);
  }

  @Post("vehicles/saved-filters")
  @RequirePermissions(permissions.fleet.read)
  createSavedFilter(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateVehicleSavedFilterDto,
    @Req() request: RequestWithContext,
  ) {
    return this.fleetService.createSavedFilter(user, body, request.device);
  }

  @Delete("vehicles/saved-filters/:filterId")
  @RequirePermissions(permissions.fleet.read)
  deleteSavedFilter(
    @CurrentUser() user: RequestPrincipal,
    @Param("filterId") filterId: string,
    @Req() request: RequestWithContext,
  ) {
    return this.fleetService.deleteSavedFilter(user, filterId, request.device);
  }

  @Post("vehicles")
  @RequirePermissions(permissions.fleet.manage)
  createVehicle(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateVehicleDto,
    @Req() request: RequestWithContext,
  ) {
    return this.fleetService.createVehicle(user, body, request.device);
  }

  @Get("vehicles/:id")
  @RequirePermissions(permissions.fleet.read)
  getVehicle(@CurrentUser() user: RequestPrincipal, @Param("id") id: string) {
    return this.fleetService.getVehicle(user, id);
  }

  @Patch("vehicles/:id")
  @RequirePermissions(permissions.fleet.manage)
  updateVehicle(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: UpdateVehicleDto,
    @Req() request: RequestWithContext,
  ) {
    return this.fleetService.updateVehicle(user, id, body, request.device);
  }

  @Patch("vehicles/:id/status")
  @RequirePermissions(permissions.fleet.manage)
  changeStatus(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ChangeVehicleStatusDto,
    @Req() request: RequestWithContext,
  ) {
    return this.fleetService.changeStatus(user, id, body, request.device);
  }

  @Post("vehicles/:id/transfer")
  @RequirePermissions(permissions.fleet.transfer)
  transferVehicle(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: TransferVehicleDto,
    @Req() request: RequestWithContext,
  ) {
    return this.fleetService.transferVehicle(user, id, body, request.device);
  }

  @Post("vehicles/:id/archive")
  @RequirePermissions(permissions.fleet.archive)
  archiveVehicle(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ArchiveVehicleDto,
    @Req() request: RequestWithContext,
  ) {
    return this.fleetService.archiveVehicle(user, id, body, request.device);
  }

  @Post("vehicles/:id/photos")
  @RequirePermissions(permissions.fleet.photos)
  addPhoto(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: CreateVehiclePhotoDto,
    @Req() request: RequestWithContext,
  ) {
    return this.fleetService.addPhoto(user, id, body, request.device);
  }

  @Get("vehicles/:id/photos")
  @RequirePermissions(permissions.fleet.read)
  listPhotos(@CurrentUser() user: RequestPrincipal, @Param("id") id: string) {
    return this.fleetService.listVehiclePhotos(user, id);
  }

  @Post("vehicles/:id/documents")
  @RequirePermissions(permissions.fleet.documents)
  addDocument(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: CreateVehicleDocumentDto,
    @Req() request: RequestWithContext,
  ) {
    return this.fleetService.addDocument(user, id, body, request.device);
  }

  @Get("vehicles/:id/documents")
  @RequirePermissions(permissions.fleet.read)
  listDocuments(@CurrentUser() user: RequestPrincipal, @Param("id") id: string) {
    return this.fleetService.listVehicleDocuments(user, id);
  }

  @Get("vehicles/:id/timeline")
  @RequirePermissions(permissions.fleet.read)
  listTimeline(@CurrentUser() user: RequestPrincipal, @Param("id") id: string) {
    return this.fleetService.listTimeline(user, id);
  }

  @Get("vehicles/:id/costs")
  @RequirePermissions(permissions.fleet.costs)
  getCosts(@CurrentUser() user: RequestPrincipal, @Param("id") id: string) {
    return this.fleetService.getCosts(user, id);
  }

  @Get("vehicles/:id/audit")
  @RequirePermissions(permissions.audit.read)
  getAudit(@CurrentUser() user: RequestPrincipal, @Param("id") id: string) {
    return this.fleetService.getAudit(user, id);
  }

  @Get("vehicles/:id/events")
  @RequirePermissions(permissions.fleet.read)
  getEvents(@CurrentUser() user: RequestPrincipal, @Param("id") id: string) {
    return this.fleetService.getEvents(user, id);
  }

  @Get("vehicles/:id/relationships")
  @RequirePermissions(permissions.fleet.read)
  getRelationships(@CurrentUser() user: RequestPrincipal, @Param("id") id: string) {
    return this.fleetService.getRelationships(user, id);
  }

  @Post("catalog/:type")
  @RequirePermissions(permissions.fleet.manage)
  createCatalog(
    @CurrentUser() user: RequestPrincipal,
    @Param("type")
    type: "categories" | "subcategories" | "makes" | "models" | "versions" | "cost-centers",
    @Body() body: CreateFleetCatalogDto,
  ) {
    return this.fleetService.createCatalog(user, type, body);
  }
}
