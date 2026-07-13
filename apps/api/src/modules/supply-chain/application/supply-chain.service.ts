import type { Prisma, SupplierStatus } from "@fleetcontrol/database";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { RequestDevice, RequestPrincipal } from "../../../common/context/request-context";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { AuditService } from "../../audit/application/audit.service";
import { EventBusService } from "../../events/application/event-bus.service";
import { NotificationsService } from "../../notifications/application/notifications.service";
import type {
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
} from "../presentation/supply-chain.dto";
import { SUPPLY_CHAIN_REPOSITORY, type SupplyChainRepository } from "./supply-chain.repository";
const n = (v: unknown) => (v == null ? null : Number(v));
@Injectable()
export class SupplyChainService {
  constructor(
    @Inject(SUPPLY_CHAIN_REPOSITORY) private readonly repository: SupplyChainRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}
  async suppliers(p: RequestPrincipal, q: ListSuppliersQueryDto) {
    const page = q.page ?? 1,
      pageSize = q.pageSize ?? 25,
      r = await this.repository.listSuppliers({ ...q, companyId: p.companyId, page, pageSize });
    return {
      data: r.data.map((x) => this.numeric(x)),
      pagination: { page, pageSize, total: r.total, pageCount: Math.ceil(r.total / pageSize) },
    };
  }
  async supplier(p: RequestPrincipal, id: string) {
    const v = await this.repository.findSupplier(p.companyId, id);
    if (!v) throw new NotFoundException("Supplier not found");
    return this.numeric(v);
  }
  async createSupplier(p: RequestPrincipal, d: CreateSupplierDto, device?: RequestDevice) {
    const s = (await this.repository.createSupplier({
      company: { connect: { id: p.companyId } },
      code: d.code,
      legalName: d.legalName.trim(),
      tradeName: d.tradeName.trim(),
      document: d.document.replace(/\D/g, ""),
      category: d.category,
      contactName: d.contactName,
      email: d.email?.toLowerCase(),
      phone: d.phone,
      address: d.address,
      city: d.city,
      state: d.state,
      paymentTermsDays: d.paymentTermsDays,
      leadTimeDays: d.leadTimeDays,
      notes: d.notes,
    })) as { id: string; tradeName: string; status: string };
    await this.record("CREATE", "Supplier", s.id, p, device, {
      tradeName: s.tradeName,
      status: s.status,
    });
    await this.events.publish({
      name: "SupplierSubmitted",
      aggregateType: "Supplier",
      aggregateId: s.id,
      companyId: p.companyId,
      payload: { tradeName: s.tradeName },
    });
    return s;
  }
  async reviewSupplier(
    p: RequestPrincipal,
    id: string,
    status: "APPROVED" | "REJECTED" | "SUSPENDED",
    d: ReviewDto,
    device?: RequestDevice,
  ) {
    const s = await this.requireSupplier(p, id);
    if (status !== "APPROVED" && !d.reason) throw new BadRequestException("Reason is required");
    if (
      status === "APPROVED" &&
      !(["PENDING_APPROVAL", "REJECTED"] as SupplierStatus[]).includes(s.status)
    )
      throw new ConflictException("Supplier is not awaiting approval");
    if (status === "SUSPENDED" && s.status !== "APPROVED")
      throw new ConflictException("Only approved suppliers can be suspended");
    await this.prisma.supplier.update({
      where: { id, companyId: p.companyId },
      data: {
        status,
        approvedById: status === "APPROVED" ? p.userId : undefined,
        approvedAt: status === "APPROVED" ? new Date() : undefined,
        suspensionReason: d.reason,
      },
    });
    await this.record("UPDATE", "Supplier", id, p, device, {
      from: s.status,
      to: status,
      reason: d.reason,
    });
    await this.events.publish({
      name: `Supplier${status.replaceAll("_", "")}`,
      aggregateType: "Supplier",
      aggregateId: id,
      companyId: p.companyId,
      payload: { from: s.status, to: status },
    });
    return { status };
  }
  async parts(p: RequestPrincipal, q: ListPartsQueryDto) {
    const page = q.page ?? 1,
      pageSize = q.pageSize ?? 25,
      r = await this.repository.listParts({ ...q, companyId: p.companyId, page, pageSize });
    return {
      data: r.data.map((x) => this.numeric(x)),
      pagination: { page, pageSize, total: r.total, pageCount: Math.ceil(r.total / pageSize) },
    };
  }
  async createPart(p: RequestPrincipal, d: CreatePartDto, device?: RequestDevice) {
    const part = await this.prisma.part.create({
      data: {
        companyId: p.companyId,
        sku: d.sku.trim(),
        name: d.name.trim(),
        description: d.description,
        category: d.category,
        manufacturer: d.manufacturer,
        manufacturerCode: d.manufacturerCode,
        barcode: d.barcode,
        unit: d.unit,
        minimumStock: d.minimumStock,
        maximumStock: d.maximumStock,
        reorderPoint: d.reorderPoint,
        compatibleVehicles: d.compatibleVehicles as Prisma.InputJsonValue,
        notes: d.notes,
      },
    });
    await this.record("CREATE", "Part", part.id, p, device, { sku: part.sku, name: part.name });
    return this.numeric(part);
  }
  async linkSupplier(
    p: RequestPrincipal,
    partId: string,
    d: LinkPartSupplierDto,
    device?: RequestDevice,
  ) {
    await this.requirePart(p, partId);
    const s = await this.requireSupplier(p, d.supplierId);
    if (s.status !== "APPROVED") throw new BadRequestException("Supplier must be approved");
    const link = await this.prisma.partSupplier.upsert({
      where: { partId_supplierId: { partId, supplierId: s.id } },
      create: {
        companyId: p.companyId,
        partId,
        supplierId: s.id,
        supplierPartNumber: d.supplierPartNumber,
        lastPrice: d.lastPrice,
        leadTimeDays: d.leadTimeDays,
        minimumOrderQty: d.minimumOrderQty,
      },
      update: {
        supplierPartNumber: d.supplierPartNumber,
        lastPrice: d.lastPrice,
        leadTimeDays: d.leadTimeDays,
        minimumOrderQty: d.minimumOrderQty,
        lastQuotedAt: new Date(),
      },
    });
    await this.record("UPDATE", "Part", partId, p, device, {
      action: "LINK_SUPPLIER",
      supplierId: s.id,
    });
    return this.numeric(link);
  }
  async warehouses(p: RequestPrincipal) {
    return this.prisma.warehouse.findMany({
      where: { companyId: p.companyId, branchId: p.branchId, archivedAt: null },
      include: { _count: { select: { stockLevels: true, purchaseOrders: true } } },
      orderBy: { name: "asc" },
    });
  }
  async createWarehouse(p: RequestPrincipal, d: CreateWarehouseDto, device?: RequestDevice) {
    const branchId = d.branchId ?? p.branchId;
    if (
      branchId &&
      !(await this.prisma.branch.count({ where: { id: branchId, companyId: p.companyId } }))
    )
      throw new BadRequestException("Invalid branch");
    const w = await this.prisma.warehouse.create({
      data: {
        companyId: p.companyId,
        branchId,
        responsibleUserId: d.responsibleUserId,
        code: d.code.trim(),
        name: d.name.trim(),
        address: d.address,
      },
    });
    await this.record("CREATE", "Warehouse", w.id, p, device, { code: w.code, name: w.name });
    return w;
  }
  async dashboard(p: RequestPrincipal) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { companyId: p.companyId, branchId: p.branchId, active: true, archivedAt: null },
      select: { id: true },
    });
    const ids = warehouses.map((w) => w.id);
    const [levels, pending, orders, suppliers] = await this.prisma.$transaction([
      this.prisma.stockLevel.findMany({
        where: { companyId: p.companyId, warehouseId: { in: ids } },
        include: { part: { select: { minimumStock: true, reorderPoint: true } } },
      }),
      this.prisma.purchaseOrder.count({
        where: { companyId: p.companyId, branchId: p.branchId, status: "AWAITING_APPROVAL" },
      }),
      this.prisma.purchaseOrder.count({
        where: {
          companyId: p.companyId,
          branchId: p.branchId,
          status: { in: ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"] },
        },
      }),
      this.prisma.supplier.count({
        where: { companyId: p.companyId, status: "APPROVED", archivedAt: null },
      }),
    ]);
    const low = levels.filter(
      (l) =>
        Number(l.quantityOnHand) - Number(l.quantityReserved) <=
        Math.max(Number(l.part.minimumStock), Number(l.part.reorderPoint)),
    ).length;
    const value = levels.reduce(
      (sum, l) => sum + Number(l.quantityOnHand) * Number(l.averageUnitCost),
      0,
    );
    return {
      warehouses: ids.length,
      approvedSuppliers: suppliers,
      lowStock: low,
      pendingApproval: pending,
      openPurchaseOrders: orders,
      inventoryValue: value,
      stockedParts: levels.filter((l) => Number(l.quantityOnHand) > 0).length,
    };
  }
  async options(p: RequestPrincipal) {
    const [suppliers, parts, warehouses, orders] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where: { companyId: p.companyId, status: "APPROVED", archivedAt: null },
        select: { id: true, tradeName: true },
        orderBy: { tradeName: "asc" },
      }),
      this.prisma.part.findMany({
        where: { companyId: p.companyId, active: true, archivedAt: null },
        select: { id: true, sku: true, name: true, unit: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.warehouse.findMany({
        where: { companyId: p.companyId, branchId: p.branchId, active: true, archivedAt: null },
        select: { id: true, code: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.maintenanceOrder.findMany({
        where: {
          companyId: p.companyId,
          branchId: p.branchId,
          status: { in: ["APPROVED", "IN_PROGRESS", "PAUSED"] },
        },
        select: { id: true, code: true, title: true, vehicle: { select: { plate: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { suppliers, parts, warehouses, maintenanceOrders: orders };
  }
  async purchaseOrders(p: RequestPrincipal) {
    const values = await this.prisma.purchaseOrder.findMany({
      where: { companyId: p.companyId, branchId: p.branchId },
      include: {
        supplier: { select: { id: true, tradeName: true } },
        warehouse: { select: { id: true, name: true } },
        items: { include: { part: { select: { id: true, sku: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return values.map((v) => this.numeric(v));
  }
  async createPurchaseOrder(
    p: RequestPrincipal,
    d: CreatePurchaseOrderDto,
    device?: RequestDevice,
  ) {
    if (!d.items.length) throw new BadRequestException("Purchase order requires items");
    const [s, w] = await Promise.all([
      this.requireSupplier(p, d.supplierId),
      this.requireWarehouse(p, d.warehouseId),
    ]);
    if (s.status !== "APPROVED") throw new BadRequestException("Supplier is not approved");
    const ids = d.items.map((i) => i.partId);
    if (
      new Set(ids).size !== ids.length ||
      (await this.prisma.part.count({
        where: { companyId: p.companyId, id: { in: ids }, active: true },
      })) !== ids.length
    )
      throw new BadRequestException("Invalid or duplicate parts");
    const subtotal = d.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0),
      discount = d.discountAmount ?? 0,
      total = subtotal - discount + (d.freightAmount ?? 0) + (d.taxAmount ?? 0);
    if (total < 0) throw new BadRequestException("Invalid totals");
    const po = await this.prisma.purchaseOrder.create({
      data: {
        companyId: p.companyId,
        branchId: w.branchId,
        supplierId: s.id,
        warehouseId: w.id,
        createdById: p.userId,
        number: d.number.trim(),
        status: "AWAITING_APPROVAL",
        expectedAt: d.expectedAt ? new Date(d.expectedAt) : undefined,
        subtotal,
        discountAmount: discount,
        freightAmount: d.freightAmount,
        taxAmount: d.taxAmount,
        totalAmount: total,
        notes: d.notes,
        items: {
          create: d.items.map((i) => ({
            companyId: p.companyId,
            partId: i.partId,
            quantityOrdered: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.quantity * i.unitPrice,
            notes: i.notes,
          })),
        },
      },
      include: { items: true },
    });
    await this.record("CREATE", "PurchaseOrder", po.id, p, device, {
      number: po.number,
      totalAmount: total,
    });
    await this.events.publish({
      name: "PurchaseOrderSubmitted",
      aggregateType: "PurchaseOrder",
      aggregateId: po.id,
      companyId: p.companyId,
      payload: { supplierId: s.id, totalAmount: total },
    });
    return this.numeric(po);
  }
  async reviewPurchaseOrder(
    p: RequestPrincipal,
    id: string,
    approve: boolean,
    d: ReviewDto,
    device?: RequestDevice,
  ) {
    const po = await this.requirePurchaseOrder(p, id);
    if (po.status !== "AWAITING_APPROVAL")
      throw new ConflictException("Purchase order is not awaiting approval");
    if (!approve && !d.reason) throw new BadRequestException("Rejection reason is required");
    const status = approve ? "APPROVED" : "REJECTED";
    await this.prisma.purchaseOrder.update({
      where: { id, companyId: p.companyId },
      data: {
        status,
        approvedById: p.userId,
        approvalNotes: approve ? d.reason : undefined,
        rejectionReason: approve ? undefined : d.reason,
        orderedAt: approve ? new Date() : undefined,
      },
    });
    await this.record("UPDATE", "PurchaseOrder", id, p, device, { from: po.status, to: status });
    await this.events.publish({
      name: approve ? "PurchaseOrderApproved" : "PurchaseOrderRejected",
      aggregateType: "PurchaseOrder",
      aggregateId: id,
      companyId: p.companyId,
      payload: { totalAmount: Number(po.totalAmount) },
    });
    return { status };
  }
  async receive(p: RequestPrincipal, id: string, d: ReceiveItemDto, device?: RequestDevice) {
    const po = await this.requirePurchaseOrder(p, id);
    if (!["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"].includes(po.status))
      throw new ConflictException("Purchase order cannot receive items");
    const result = await this.prisma.$transaction(
      async (tx) => {
        const item = await tx.purchaseOrderItem.findFirst({
          where: { id: d.purchaseOrderItemId, purchaseOrderId: id, companyId: p.companyId },
        });
        if (!item) throw new NotFoundException("Purchase item not found");
        const remaining = Number(item.quantityOrdered) - Number(item.quantityReceived);
        if (d.quantity > remaining)
          throw new BadRequestException("Receipt exceeds outstanding quantity");
        const level = await tx.stockLevel.findUnique({
          where: { warehouseId_partId: { warehouseId: po.warehouseId, partId: item.partId } },
        });
        const oldQty = Number(level?.quantityOnHand ?? 0),
          oldCost = Number(level?.averageUnitCost ?? 0),
          newQty = oldQty + d.quantity,
          newAvg = newQty
            ? (oldQty * oldCost + d.quantity * Number(item.unitPrice)) / newQty
            : Number(item.unitPrice);
        await tx.stockLevel.upsert({
          where: { warehouseId_partId: { warehouseId: po.warehouseId, partId: item.partId } },
          create: {
            companyId: p.companyId,
            warehouseId: po.warehouseId,
            partId: item.partId,
            quantityOnHand: d.quantity,
            averageUnitCost: newAvg,
            lastMovementAt: new Date(),
          },
          update: {
            quantityOnHand: { increment: d.quantity },
            averageUnitCost: newAvg,
            lastMovementAt: new Date(),
          },
        });
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: { increment: d.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            companyId: p.companyId,
            partId: item.partId,
            toWarehouseId: po.warehouseId,
            purchaseOrderId: id,
            purchaseOrderItemId: item.id,
            createdById: p.userId,
            type: "RECEIPT",
            quantity: d.quantity,
            unitCost: item.unitPrice,
            totalCost: d.quantity * Number(item.unitPrice),
            reference: d.reference,
          },
        });
        const outstanding = await tx.purchaseOrderItem.count({
          where: {
            purchaseOrderId: id,
            quantityReceived: { lt: tx.purchaseOrderItem.fields.quantityOrdered },
          },
        });
        const status = outstanding ? "PARTIALLY_RECEIVED" : "RECEIVED";
        await tx.purchaseOrder.update({
          where: { id, companyId: p.companyId },
          data: {
            status,
            invoiceNumber: d.invoiceNumber,
            receivedAt: status === "RECEIVED" ? new Date() : undefined,
          },
        });
        if (status === "RECEIVED")
          await tx.supplier.update({
            where: { id: po.supplierId, companyId: p.companyId },
            data: { totalPurchased: { increment: po.totalAmount } },
          });
        return { status, partId: item.partId, newQuantity: newQty, averageUnitCost: newAvg };
      },
      { isolationLevel: "Serializable" },
    );
    await this.record("UPDATE", "PurchaseOrder", id, p, device, { action: "RECEIVE", ...result });
    await this.events.publish({
      name: "InventoryReceived",
      aggregateType: "PurchaseOrder",
      aggregateId: id,
      companyId: p.companyId,
      payload: result,
    });
    return result;
  }
  async issue(p: RequestPrincipal, d: IssueStockDto, device?: RequestDevice) {
    const [w, part, order] = await Promise.all([
      this.requireWarehouse(p, d.warehouseId),
      this.requirePart(p, d.partId),
      this.requireMaintenanceOrder(p, d.maintenanceOrderId),
    ]);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const level = await tx.stockLevel.findUnique({
          where: { warehouseId_partId: { warehouseId: w.id, partId: part.id } },
        });
        const available = Number(level?.quantityOnHand ?? 0) - Number(level?.quantityReserved ?? 0);
        if (available < d.quantity) throw new ConflictException("Insufficient available stock");
        const updated = await tx.stockLevel.updateMany({
          where: { warehouseId: w.id, partId: part.id, quantityOnHand: { gte: d.quantity } },
          data: { quantityOnHand: { decrement: d.quantity }, lastMovementAt: new Date() },
        });
        if (updated.count !== 1) throw new ConflictException("Stock changed concurrently");
        const cost = Number(level?.averageUnitCost ?? 0),
          total = cost * d.quantity;
        await tx.stockMovement.create({
          data: {
            companyId: p.companyId,
            partId: part.id,
            fromWarehouseId: w.id,
            maintenanceOrderId: order.id,
            createdById: p.userId,
            type: "ISSUE",
            quantity: d.quantity,
            unitCost: cost,
            totalCost: total,
            reason: d.reason,
          },
        });
        await tx.maintenanceOrderItem.create({
          data: {
            companyId: p.companyId,
            orderId: order.id,
            type: "PART",
            description: part.name,
            sku: part.sku,
            quantity: d.quantity,
            unitCost: cost,
            totalCost: total,
            notes: `Issued from ${w.code}`,
          },
        });
        return { remaining: Number(level!.quantityOnHand) - d.quantity, totalCost: total };
      },
      { isolationLevel: "Serializable" },
    );
    await this.record("CREATE", "StockMovement", `${w.id}:${part.id}`, p, device, {
      action: "ISSUE",
      maintenanceOrderId: order.id,
      quantity: d.quantity,
    });
    if (result.remaining <= Number(part.reorderPoint))
      await this.notifications.create({
        companyId: p.companyId,
        userId: p.userId,
        channel: "INTERNAL",
        category: "inventory.low_stock",
        title: "Estoque abaixo do ponto de reposicao",
        body: `${part.sku} - ${part.name}: ${result.remaining} ${part.unit}`,
        priority: "HIGH",
        metadata: { partId: part.id, warehouseId: w.id },
      });
    await this.events.publish({
      name: "InventoryIssued",
      aggregateType: "MaintenanceOrder",
      aggregateId: order.id,
      companyId: p.companyId,
      payload: { partId: part.id, quantity: d.quantity, totalCost: result.totalCost },
    });
    return result;
  }
  async transfer(p: RequestPrincipal, d: TransferStockDto, device?: RequestDevice) {
    if (d.fromWarehouseId === d.toWarehouseId)
      throw new BadRequestException("Warehouses must differ");
    const [from, to, part] = await Promise.all([
      this.requireWarehouse(p, d.fromWarehouseId),
      this.requireWarehouse(p, d.toWarehouseId),
      this.requirePart(p, d.partId),
    ]);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const source = await tx.stockLevel.findUnique({
          where: { warehouseId_partId: { warehouseId: from.id, partId: part.id } },
        });
        if (
          Number(source?.quantityOnHand ?? 0) - Number(source?.quantityReserved ?? 0) <
          d.quantity
        )
          throw new ConflictException("Insufficient stock");
        const changed = await tx.stockLevel.updateMany({
          where: { warehouseId: from.id, partId: part.id, quantityOnHand: { gte: d.quantity } },
          data: { quantityOnHand: { decrement: d.quantity }, lastMovementAt: new Date() },
        });
        if (changed.count !== 1) throw new ConflictException("Stock changed concurrently");
        const target = await tx.stockLevel.findUnique({
          where: { warehouseId_partId: { warehouseId: to.id, partId: part.id } },
        });
        const old = Number(target?.quantityOnHand ?? 0),
          cost = Number(source?.averageUnitCost ?? 0),
          targetCost = Number(target?.averageUnitCost ?? 0),
          avg =
            old + d.quantity ? (old * targetCost + d.quantity * cost) / (old + d.quantity) : cost;
        await tx.stockLevel.upsert({
          where: { warehouseId_partId: { warehouseId: to.id, partId: part.id } },
          create: {
            companyId: p.companyId,
            warehouseId: to.id,
            partId: part.id,
            quantityOnHand: d.quantity,
            averageUnitCost: avg,
            lastMovementAt: new Date(),
          },
          update: {
            quantityOnHand: { increment: d.quantity },
            averageUnitCost: avg,
            lastMovementAt: new Date(),
          },
        });
        await tx.stockMovement.create({
          data: {
            companyId: p.companyId,
            partId: part.id,
            fromWarehouseId: from.id,
            toWarehouseId: to.id,
            createdById: p.userId,
            type: "TRANSFER",
            quantity: d.quantity,
            unitCost: cost,
            totalCost: d.quantity * cost,
            reason: d.reason,
          },
        });
        return { transferred: true };
      },
      { isolationLevel: "Serializable" },
    );
    await this.record("CREATE", "StockMovement", `${from.id}:${to.id}:${part.id}`, p, device, {
      action: "TRANSFER",
      quantity: d.quantity,
    });
    return result;
  }
  async adjust(p: RequestPrincipal, d: AdjustStockDto, device?: RequestDevice) {
    if (!d.quantity) throw new BadRequestException("Adjustment cannot be zero");
    const [w, part] = await Promise.all([
      this.requireWarehouse(p, d.warehouseId),
      this.requirePart(p, d.partId),
    ]);
    const level = await this.prisma.stockLevel.findUnique({
      where: { warehouseId_partId: { warehouseId: w.id, partId: part.id } },
    });
    if (
      d.quantity < 0 &&
      Number(level?.quantityOnHand ?? 0) + d.quantity < Number(level?.quantityReserved ?? 0)
    )
      throw new ConflictException("Adjustment would violate reserved stock");
    const cost = d.unitCost ?? Number(level?.averageUnitCost ?? 0);
    await this.prisma.$transaction([
      this.prisma.stockLevel.upsert({
        where: { warehouseId_partId: { warehouseId: w.id, partId: part.id } },
        create: {
          companyId: p.companyId,
          warehouseId: w.id,
          partId: part.id,
          quantityOnHand: d.quantity,
          averageUnitCost: cost,
          lastMovementAt: new Date(),
        },
        update: {
          quantityOnHand: { increment: d.quantity },
          averageUnitCost: d.quantity > 0 && d.unitCost != null ? cost : undefined,
          lastMovementAt: new Date(),
        },
      }),
      this.prisma.stockMovement.create({
        data: {
          companyId: p.companyId,
          partId: part.id,
          fromWarehouseId: d.quantity < 0 ? w.id : undefined,
          toWarehouseId: d.quantity > 0 ? w.id : undefined,
          createdById: p.userId,
          type: d.quantity > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
          quantity: Math.abs(d.quantity),
          unitCost: cost,
          totalCost: Math.abs(d.quantity) * cost,
          reason: d.reason,
        },
      }),
    ]);
    await this.record("CREATE", "StockMovement", `${w.id}:${part.id}`, p, device, {
      action: "ADJUST",
      quantity: d.quantity,
      reason: d.reason,
    });
    return { adjusted: true };
  }
  private async requireSupplier(p: RequestPrincipal, id: string) {
    const s = await this.prisma.supplier.findFirst({
      where: { id, companyId: p.companyId, archivedAt: null },
    });
    if (!s) throw new NotFoundException("Supplier not found");
    return s;
  }
  private async requirePart(p: RequestPrincipal, id: string) {
    const v = await this.prisma.part.findFirst({
      where: { id, companyId: p.companyId, archivedAt: null },
    });
    if (!v) throw new NotFoundException("Part not found");
    return v;
  }
  private async requireWarehouse(p: RequestPrincipal, id: string) {
    const w = await this.prisma.warehouse.findFirst({
      where: { id, companyId: p.companyId, branchId: p.branchId, active: true, archivedAt: null },
    });
    if (!w) throw new NotFoundException("Warehouse not found");
    return w;
  }
  private async requirePurchaseOrder(p: RequestPrincipal, id: string) {
    const v = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId: p.companyId, branchId: p.branchId },
      include: { items: true },
    });
    if (!v) throw new NotFoundException("Purchase order not found");
    return v;
  }
  private async requireMaintenanceOrder(p: RequestPrincipal, id: string) {
    const v = await this.prisma.maintenanceOrder.findFirst({
      where: {
        id,
        companyId: p.companyId,
        branchId: p.branchId,
        status: { in: ["APPROVED", "IN_PROGRESS", "PAUSED"] },
      },
    });
    if (!v) throw new NotFoundException("Active maintenance order not found");
    return v;
  }
  private record(
    action: "CREATE" | "UPDATE",
    tableName: string,
    recordId: string,
    p: RequestPrincipal,
    device: RequestDevice | undefined,
    value: Record<string, unknown>,
  ) {
    return this.audit.record({
      action,
      tableName,
      recordId,
      actorId: p.userId,
      companyId: p.companyId,
      newValue: value as Prisma.InputJsonObject,
      device,
    });
  }
  private numeric(v: unknown): unknown {
    if (Array.isArray(v)) return v.map((x) => this.numeric(x));
    if (v && typeof v === "object") {
      if (v.constructor?.name === "Decimal") return Number(v);
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, this.numeric(x)]));
    }
    return v;
  }
}
