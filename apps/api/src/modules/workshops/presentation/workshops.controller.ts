import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { RequestPrincipal, RequestWithContext } from "../../../common/context/request-context";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { WorkshopsService } from "../application/workshops.service";
import {
  CreateWorkshopDto,
  CreateWorkshopQuoteDto,
  CreateWorkshopServiceDto,
  EvaluateWorkshopDto,
  ListWorkshopQuotesQueryDto,
  ListWorkshopsQueryDto,
  ReviewWorkshopDto,
} from "./workshops.dto";
@ApiBearerAuth()
@ApiTags("workshops")
@Controller("workshops")
export class WorkshopsController {
  constructor(private readonly service: WorkshopsService) {}
  @Get() @RequirePermissions(permissions.workshops.read) list(
    @CurrentUser() user: RequestPrincipal,
    @Query() query: ListWorkshopsQueryDto,
  ) {
    return this.service.list(user, query);
  }
  @Get("dashboard") @RequirePermissions(permissions.workshops.read) dashboard(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.dashboard(user);
  }
  @Get("options") @RequirePermissions(permissions.workshops.read) options(
    @CurrentUser() user: RequestPrincipal,
  ) {
    return this.service.options(user);
  }
  @Get("quotes") @RequirePermissions(permissions.workshops.read) quotes(
    @CurrentUser() user: RequestPrincipal,
    @Query() query: ListWorkshopQuotesQueryDto,
  ) {
    return this.service.quotes(user, query);
  }
  @Post("quotes") @RequirePermissions(permissions.workshops.quotes) createQuote(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateWorkshopQuoteDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.createQuote(user, body, request.device);
  }
  @Patch("quotes/:quoteId/select") @RequirePermissions(permissions.workshops.quotes) selectQuote(
    @CurrentUser() user: RequestPrincipal,
    @Param("quoteId") quoteId: string,
    @Req() request: RequestWithContext,
  ) {
    return this.service.selectQuote(user, quoteId, request.device);
  }
  @Post() @RequirePermissions(permissions.workshops.manage) create(
    @CurrentUser() user: RequestPrincipal,
    @Body() body: CreateWorkshopDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.create(user, body, request.device);
  }
  @Get(":id") @RequirePermissions(permissions.workshops.read) get(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
  ) {
    return this.service.get(user, id);
  }
  @Patch(":id/approve") @RequirePermissions(permissions.workshops.approve) approve(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ReviewWorkshopDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.approve(user, id, body, request.device);
  }
  @Patch(":id/reject") @RequirePermissions(permissions.workshops.approve) reject(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ReviewWorkshopDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.reject(user, id, body, request.device);
  }
  @Patch(":id/suspend") @RequirePermissions(permissions.workshops.approve) suspend(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: ReviewWorkshopDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.suspend(user, id, body, request.device);
  }
  @Post(":id/services") @RequirePermissions(permissions.workshops.catalog) addService(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: CreateWorkshopServiceDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.addService(user, id, body, request.device);
  }
  @Post(":id/evaluations") @RequirePermissions(permissions.workshops.evaluate) evaluate(
    @CurrentUser() user: RequestPrincipal,
    @Param("id") id: string,
    @Body() body: EvaluateWorkshopDto,
    @Req() request: RequestWithContext,
  ) {
    return this.service.evaluate(user, id, body, request.device);
  }
}
