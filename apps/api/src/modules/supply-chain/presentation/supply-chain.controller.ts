import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { RequestPrincipal, RequestWithContext } from "../../../common/context/request-context";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import { SupplyChainService } from "../application/supply-chain.service";
import {
  AdjustStockDto,
  CreatePartDto,
  CreatePurchaseOrderDto,
  CreateSupplierDto,
  CreateWarehouseDto,
  IssueStockDto,
  LinkPartSupplierDto,
  ListPartsQueryDto,
  ListSuppliersQueryDto,
  ReceiveItemDto,
  ReviewDto,
  TransferStockDto,
} from "./supply-chain.dto";
@ApiBearerAuth()
@ApiTags("suppliers", "inventory")
@Controller()
export class SupplyChainController {
  constructor(private readonly service: SupplyChainService) {}
  @Get("suppliers") @RequirePermissions(permissions.suppliers.read) suppliers(
    @CurrentUser() u: RequestPrincipal,
    @Query() q: ListSuppliersQueryDto,
  ) {
    return this.service.suppliers(u, q);
  }
  @Post("suppliers") @RequirePermissions(permissions.suppliers.manage) createSupplier(
    @CurrentUser() u: RequestPrincipal,
    @Body() b: CreateSupplierDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.createSupplier(u, b, r.device);
  }
  @Get("suppliers/:id") @RequirePermissions(permissions.suppliers.read) supplier(
    @CurrentUser() u: RequestPrincipal,
    @Param("id") id: string,
  ) {
    return this.service.supplier(u, id);
  }
  @Patch("suppliers/:id/approve")
  @RequirePermissions(permissions.suppliers.approve)
  approveSupplier(
    @CurrentUser() u: RequestPrincipal,
    @Param("id") id: string,
    @Body() b: ReviewDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.reviewSupplier(u, id, "APPROVED", b, r.device);
  }
  @Patch("suppliers/:id/reject") @RequirePermissions(permissions.suppliers.approve) rejectSupplier(
    @CurrentUser() u: RequestPrincipal,
    @Param("id") id: string,
    @Body() b: ReviewDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.reviewSupplier(u, id, "REJECTED", b, r.device);
  }
  @Get("inventory/dashboard") @RequirePermissions(permissions.inventory.read) dashboard(
    @CurrentUser() u: RequestPrincipal,
  ) {
    return this.service.dashboard(u);
  }
  @Get("inventory/options") @RequirePermissions(permissions.inventory.read) options(
    @CurrentUser() u: RequestPrincipal,
  ) {
    return this.service.options(u);
  }
  @Get("inventory/parts") @RequirePermissions(permissions.inventory.read) parts(
    @CurrentUser() u: RequestPrincipal,
    @Query() q: ListPartsQueryDto,
  ) {
    return this.service.parts(u, q);
  }
  @Post("inventory/parts") @RequirePermissions(permissions.inventory.manage) createPart(
    @CurrentUser() u: RequestPrincipal,
    @Body() b: CreatePartDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.createPart(u, b, r.device);
  }
  @Post("inventory/parts/:id/suppliers") @RequirePermissions(permissions.suppliers.catalog) link(
    @CurrentUser() u: RequestPrincipal,
    @Param("id") id: string,
    @Body() b: LinkPartSupplierDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.linkSupplier(u, id, b, r.device);
  }
  @Get("inventory/warehouses") @RequirePermissions(permissions.inventory.read) warehouses(
    @CurrentUser() u: RequestPrincipal,
  ) {
    return this.service.warehouses(u);
  }
  @Post("inventory/warehouses") @RequirePermissions(permissions.inventory.manage) createWarehouse(
    @CurrentUser() u: RequestPrincipal,
    @Body() b: CreateWarehouseDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.createWarehouse(u, b, r.device);
  }
  @Get("inventory/purchase-orders") @RequirePermissions(permissions.suppliers.purchase) orders(
    @CurrentUser() u: RequestPrincipal,
  ) {
    return this.service.purchaseOrders(u);
  }
  @Post("inventory/purchase-orders")
  @RequirePermissions(permissions.suppliers.purchase)
  createOrder(
    @CurrentUser() u: RequestPrincipal,
    @Body() b: CreatePurchaseOrderDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.createPurchaseOrder(u, b, r.device);
  }
  @Patch("inventory/purchase-orders/:id/approve")
  @RequirePermissions(permissions.suppliers.approve)
  approveOrder(
    @CurrentUser() u: RequestPrincipal,
    @Param("id") id: string,
    @Body() b: ReviewDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.reviewPurchaseOrder(u, id, true, b, r.device);
  }
  @Patch("inventory/purchase-orders/:id/reject")
  @RequirePermissions(permissions.suppliers.approve)
  rejectOrder(
    @CurrentUser() u: RequestPrincipal,
    @Param("id") id: string,
    @Body() b: ReviewDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.reviewPurchaseOrder(u, id, false, b, r.device);
  }
  @Post("inventory/purchase-orders/:id/receipts")
  @RequirePermissions(permissions.inventory.receive)
  receive(
    @CurrentUser() u: RequestPrincipal,
    @Param("id") id: string,
    @Body() b: ReceiveItemDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.receive(u, id, b, r.device);
  }
  @Post("inventory/issues") @RequirePermissions(permissions.inventory.issue) issue(
    @CurrentUser() u: RequestPrincipal,
    @Body() b: IssueStockDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.issue(u, b, r.device);
  }
  @Post("inventory/transfers") @RequirePermissions(permissions.inventory.move) transfer(
    @CurrentUser() u: RequestPrincipal,
    @Body() b: TransferStockDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.transfer(u, b, r.device);
  }
  @Post("inventory/adjustments") @RequirePermissions(permissions.inventory.adjust) adjust(
    @CurrentUser() u: RequestPrincipal,
    @Body() b: AdjustStockDto,
    @Req() r: RequestWithContext,
  ) {
    return this.service.adjust(u, b, r.device);
  }
}
