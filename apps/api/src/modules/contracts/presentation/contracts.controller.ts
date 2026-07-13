import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { RequestPrincipal, RequestWithContext } from "../../../common/context/request-context";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { ContractsService } from "../application/contracts.service";
import {
  AllocateContractVehicleDto,
  ArchiveContractDto,
  ChangeContractStatusDto,
  CreateContractAmendmentDto,
  CreateContractDocumentDto,
  CreateContractDto,
  ListContractsQueryDto,
  ReleaseContractVehicleDto,
  UpdateContractDto,
} from "./contracts.dto";

@ApiBearerAuth()
@ApiTags("contracts")
@Controller("contracts")
export class ContractsController {
  constructor(private readonly service: ContractsService) {}
  @Get() @RequirePermissions(permissions.contracts.read) list(
    @CurrentUser() user: RequestPrincipal,
    @Query() query: ListContractsQueryDto,
  ) {
    return this.service.list(user, query);
  }
  @Get("dashboard") @RequirePermissions(permissions.contracts.read) dashboard(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.dashboard(user);
  }
  @Get("options") @RequirePermissions(permissions.contracts.read) options(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.options(user);
  }
  @Post() @RequirePermissions(permissions.contracts.manage) create(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateContractDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.create(user, body, request.device);
  }
  @Get(":id") @RequirePermissions(permissions.contracts.read) get(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
  ) {
    return this.service.get(user, id);
  }
  @Patch(":id") @RequirePermissions(permissions.contracts.manage) update(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: UpdateContractDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.update(user, id, body, request.device);
  }
  @Patch(":id/status") @RequirePermissions(permissions.contracts.manage) status(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ChangeContractStatusDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.changeStatus(user, id, body, request.device);
  }
  @Post(":id/amendments") @RequirePermissions(permissions.contracts.amend) amendment(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: CreateContractAmendmentDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.addAmendment(user, id, body, request.device);
  }
  @Post(":id/allocations") @RequirePermissions(permissions.contracts.allocate) allocate(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: AllocateContractVehicleDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.allocateVehicle(user, id, body, request.device);
  }
  @Patch(":id/allocations/:allocationId/release")
  @RequirePermissions(permissions.contracts.allocate)
  release(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Param("allocationId") allocationId: string,
    @Body() body: ReleaseContractVehicleDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.releaseVehicle(user, id, allocationId, body, request.device);
  }
  @Post(":id/documents") @RequirePermissions(permissions.contracts.documents) document(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: CreateContractDocumentDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.addDocument(user, id, body, request.device);
  }
  @Post(":id/archive") @RequirePermissions(permissions.contracts.archive) archive(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ArchiveContractDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.archive(user, id, body, request.device);
  }
}
