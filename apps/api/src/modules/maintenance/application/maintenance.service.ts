import type { Prisma } from "@fleetcontrol/database";
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
  CompleteMaintenanceDto,
  CreateMaintenanceOrderDto,
  CreateMaintenancePlanDto,
  ListMaintenanceOrdersQueryDto,
  ReviewMaintenanceDto,
  StartMaintenanceDto,
} from "../presentation/maintenance.dto";
import { MAINTENANCE_REPOSITORY, type MaintenanceRepository } from "./maintenance.repository";

type OrderRecord = Prisma.MaintenanceOrderGetPayload<{
  include: {
    vehicle: true;
    plan: true;
    requestedBy: true;
    approvedBy: true;
    completedBy: true;
    items: true;
  };
}>;
const num = (value: unknown) => (value == null ? null : Number(value));

@Injectable()
export class MaintenanceService {
  constructor(
    @Inject(MAINTENANCE_REPOSITORY) private readonly repository: MaintenanceRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(principal: RequestPrincipal, query: ListMaintenanceOrdersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const result = await this.repository.list({
      ...query,
      companyId: principal.companyId,
      branchId: principal.branchId,
      page,
      pageSize,
    });
    return {
      data: result.data.map((item) => this.response(item as OrderRecord)),
      pagination: {
        page,
        pageSize,
        total: result.total,
        pageCount: Math.ceil(result.total / pageSize),
      },
    };
  }
  async get(principal: RequestPrincipal, id: string) {
    return this.response(await this.requireOrder(principal, id));
  }
  async dashboard(principal: RequestPrincipal) {
    const now = new Date();
    const scope = {
      companyId: principal.companyId,
      branchId: principal.branchId,
      archivedAt: null,
    };
    const [awaiting, active, critical, plans, month] = await this.prisma.$transaction([
      this.prisma.maintenanceOrder.count({ where: { ...scope, status: "AWAITING_APPROVAL" } }),
      this.prisma.maintenanceOrder.count({
        where: { ...scope, status: { in: ["APPROVED", "IN_PROGRESS", "PAUSED"] } },
      }),
      this.prisma.maintenanceOrder.count({
        where: {
          ...scope,
          priority: "CRITICAL",
          status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] },
        },
      }),
      this.prisma.maintenancePlan.findMany({
        where: {
          companyId: principal.companyId,
          active: true,
          archivedAt: null,
          vehicle: { branchId: principal.branchId },
        },
        select: {
          nextDueAt: true,
          nextDueOdometer: true,
          alertDaysBefore: true,
          alertKmBefore: true,
          vehicle: { select: { currentOdometer: true } },
        },
      }),
      this.prisma.maintenanceOrder.aggregate({
        where: {
          ...scope,
          status: "COMPLETED",
          completedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
        _sum: { actualCost: true },
        _avg: { actualCost: true },
      }),
    ]);
    const plansDueSoon = plans.filter((plan) => {
      const dateThreshold = new Date(now);
      dateThreshold.setDate(dateThreshold.getDate() + plan.alertDaysBefore);
      const dueByDate = plan.nextDueAt != null && plan.nextDueAt <= dateThreshold;
      const odometer = num(plan.vehicle.currentOdometer);
      const dueOdometer = num(plan.nextDueOdometer);
      const alertKm = num(plan.alertKmBefore) ?? 0;
      return (
        dueByDate || (odometer != null && dueOdometer != null && odometer >= dueOdometer - alertKm)
      );
    }).length;
    return {
      awaitingApproval: awaiting,
      active,
      critical,
      plansDueSoon,
      monthlyCost: Number(month._sum.actualCost ?? 0),
      averageOrderCost: Number(month._avg.actualCost ?? 0),
    };
  }
  async options(principal: RequestPrincipal) {
    const [vehicles, plans] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where: { companyId: principal.companyId, archivedAt: null },
        select: { id: true, plate: true, status: true, currentOdometer: true },
        orderBy: { plate: "asc" },
      }),
      this.prisma.maintenancePlan.findMany({
        where: { companyId: principal.companyId, active: true, archivedAt: null },
        select: { id: true, name: true, vehicleId: true, nextDueAt: true, nextDueOdometer: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return {
      vehicles: vehicles.map((v) => ({ ...v, currentOdometer: num(v.currentOdometer) })),
      plans: plans.map((p) => ({ ...p, nextDueOdometer: num(p.nextDueOdometer) })),
      types: ["PREVENTIVE", "CORRECTIVE", "PREDICTIVE", "INSPECTION", "CAMPAIGN"],
      priorities: ["LOW", "NORMAL", "HIGH", "CRITICAL"],
    };
  }
  async plans(principal: RequestPrincipal) {
    const values = await this.prisma.maintenancePlan.findMany({
      where: { companyId: principal.companyId, archivedAt: null },
      include: {
        vehicle: { select: { id: true, plate: true, currentOdometer: true } },
        _count: { select: { orders: true } },
      },
      orderBy: [{ active: "desc" }, { nextDueAt: "asc" }],
    });
    return values.map((p) => ({
      ...p,
      intervalKm: num(p.intervalKm),
      lastOdometer: num(p.lastOdometer),
      nextDueOdometer: num(p.nextDueOdometer),
      alertKmBefore: num(p.alertKmBefore),
      estimatedCost: num(p.estimatedCost),
      vehicle: { ...p.vehicle, currentOdometer: num(p.vehicle.currentOdometer) },
    }));
  }
  async createPlan(
    principal: RequestPrincipal,
    dto: CreateMaintenancePlanDto,
    device?: RequestDevice,
  ) {
    if (!dto.intervalDays && !dto.intervalKm)
      throw new BadRequestException("A time or mileage interval is required");
    const vehicle = await this.requireVehicle(principal, dto.vehicleId);
    const lastDate = dto.lastPerformedAt ? new Date(dto.lastPerformedAt) : new Date();
    const lastOdometer = dto.lastOdometer ?? num(vehicle.currentOdometer) ?? 0;
    const nextDueAt = dto.intervalDays
      ? new Date(lastDate.getTime() + dto.intervalDays * 86_400_000)
      : undefined;
    const nextDueOdometer = dto.intervalKm ? lastOdometer + dto.intervalKm : undefined;
    const plan = await this.prisma.maintenancePlan.create({
      data: {
        companyId: principal.companyId,
        vehicleId: vehicle.id,
        name: dto.name.trim(),
        description: dto.description,
        type: dto.type,
        intervalDays: dto.intervalDays,
        intervalKm: dto.intervalKm,
        lastPerformedAt: dto.lastPerformedAt ? lastDate : undefined,
        lastOdometer: dto.lastOdometer,
        nextDueAt,
        nextDueOdometer,
        alertDaysBefore: dto.alertDaysBefore,
        alertKmBefore: dto.alertKmBefore,
        estimatedCost: dto.estimatedCost,
      },
    });
    await this.record("CREATE", "MaintenancePlan", plan.id, principal, device, {
      vehicleId: vehicle.id,
      name: plan.name,
    });
    await this.events.publish({
      name: "MaintenancePlanCreated",
      aggregateType: "MaintenancePlan",
      aggregateId: plan.id,
      companyId: principal.companyId,
      payload: { vehicleId: vehicle.id, nextDueAt },
    });
    return plan;
  }
  async create(
    principal: RequestPrincipal,
    dto: CreateMaintenanceOrderDto,
    device?: RequestDevice,
  ) {
    const vehicle = await this.requireVehicle(principal, dto.vehicleId);
    if (
      dto.planId &&
      !(await this.prisma.maintenancePlan.count({
        where: {
          id: dto.planId,
          companyId: principal.companyId,
          vehicleId: vehicle.id,
          active: true,
        },
      }))
    )
      throw new BadRequestException("Invalid maintenance plan");
    const order = (await this.repository.create({
      company: { connect: { id: principal.companyId } },
      branch: vehicle.branchId ? { connect: { id: vehicle.branchId } } : undefined,
      vehicle: { connect: { id: vehicle.id } },
      plan: dto.planId ? { connect: { id: dto.planId } } : undefined,
      requestedBy: { connect: { id: principal.userId } },
      code: dto.code.trim(),
      title: dto.title.trim(),
      description: dto.description,
      type: dto.type,
      priority: dto.priority,
      odometer: dto.odometer,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      estimatedCost: dto.estimatedCost,
      notes: dto.notes,
      status: "AWAITING_APPROVAL",
      items: dto.items?.length
        ? {
            create: dto.items.map((item) => ({
              companyId: principal.companyId,
              type: item.type,
              description: item.description,
              sku: item.sku,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.quantity * item.unitCost,
              notes: item.notes,
            })),
          }
        : undefined,
    })) as OrderRecord;
    await this.record("CREATE", "MaintenanceOrder", order.id, principal, device, {
      code: order.code,
      vehicleId: vehicle.id,
      status: order.status,
    });
    await this.events.publish({
      name: "MaintenanceOrderSubmitted",
      aggregateType: "MaintenanceOrder",
      aggregateId: order.id,
      companyId: principal.companyId,
      payload: { vehicleId: vehicle.id, priority: order.priority },
    });
    if (order.priority === "CRITICAL")
      await this.notifications.create({
        companyId: principal.companyId,
        userId: principal.userId,
        channel: "INTERNAL",
        category: "maintenance.critical",
        title: "Manutencao critica aguardando aprovacao",
        body: `${vehicle.plate}: ${order.title}`,
        priority: "CRITICAL",
        metadata: { orderId: order.id, vehicleId: vehicle.id },
      });
    return this.response(order);
  }
  async approve(
    principal: RequestPrincipal,
    id: string,
    dto: ReviewMaintenanceDto,
    device?: RequestDevice,
  ) {
    const order = await this.requireOrder(principal, id);
    if (order.status !== "AWAITING_APPROVAL")
      throw new ConflictException("Maintenance order is not awaiting approval");
    const otherOrder =
      order.vehicle.status === "IN_MAINTENANCE"
        ? await this.prisma.maintenanceOrder.findFirst({
            where: {
              companyId: principal.companyId,
              vehicleId: order.vehicleId,
              id: { not: id },
              status: { in: ["APPROVED", "IN_PROGRESS", "PAUSED"] },
            },
            select: { previousVehicleStatus: true },
          })
        : null;
    const previousVehicleStatus =
      order.vehicle.status === "IN_MAINTENANCE"
        ? (otherOrder?.previousVehicleStatus ?? "AVAILABLE")
        : order.vehicle.status;
    await this.prisma.$transaction([
      this.prisma.maintenanceOrder.update({
        where: { id, companyId: principal.companyId },
        data: {
          status: "APPROVED",
          approvedById: principal.userId,
          approvalNotes: dto.reason,
          previousVehicleStatus,
        },
      }),
      this.prisma.vehicle.update({
        where: { id: order.vehicleId, companyId: principal.companyId },
        data: { status: "IN_MAINTENANCE" },
      }),
      this.prisma.vehicleTimelineEvent.create({
        data: {
          companyId: principal.companyId,
          vehicleId: order.vehicleId,
          actorId: principal.userId,
          type: "MAINTENANCE",
          title: "Ordem de manutencao aprovada",
          description: `${order.code} - ${order.title}`,
          metadata: { orderId: id },
        },
      }),
    ]);
    await this.transition(order, "APPROVED", principal, device);
    return { approved: true };
  }
  async reject(
    principal: RequestPrincipal,
    id: string,
    dto: ReviewMaintenanceDto,
    device?: RequestDevice,
  ) {
    const order = await this.requireOrder(principal, id);
    if (order.status !== "AWAITING_APPROVAL")
      throw new ConflictException("Maintenance order is not awaiting approval");
    if (!dto.reason) throw new BadRequestException("Rejection reason is required");
    await this.prisma.maintenanceOrder.update({
      where: { id, companyId: principal.companyId },
      data: { status: "REJECTED", approvedById: principal.userId, rejectionReason: dto.reason },
    });
    await this.transition(order, "REJECTED", principal, device, dto.reason);
    return { rejected: true };
  }
  async start(
    principal: RequestPrincipal,
    id: string,
    dto: StartMaintenanceDto,
    device?: RequestDevice,
  ) {
    const order = await this.requireOrder(principal, id);
    if (order.status !== "APPROVED" && order.status !== "PAUSED")
      throw new ConflictException("Maintenance order cannot be started");
    const now = new Date();
    await this.prisma.maintenanceOrder.update({
      where: { id, companyId: principal.companyId },
      data: {
        status: "IN_PROGRESS",
        startedAt: order.startedAt ?? now,
        downtimeStartedAt: order.downtimeStartedAt ?? now,
        diagnosis: dto.diagnosis ?? order.diagnosis,
      },
    });
    await this.transition(order, "IN_PROGRESS", principal, device);
    return { started: true };
  }
  async complete(
    principal: RequestPrincipal,
    id: string,
    dto: CompleteMaintenanceDto,
    device?: RequestDevice,
  ) {
    const order = await this.requireOrder(principal, id);
    if (order.status !== "IN_PROGRESS")
      throw new ConflictException("Only an in-progress order can be completed");
    const completedAt = dto.completedAt ? new Date(dto.completedAt) : new Date();
    const newItems = dto.items ?? [];
    const result = await this.prisma.$transaction(async (tx) => {
      if (newItems.length)
        await tx.maintenanceOrderItem.createMany({
          data: newItems.map((item) => ({
            companyId: principal.companyId,
            orderId: id,
            type: item.type,
            description: item.description,
            sku: item.sku,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
            notes: item.notes,
          })),
        });
      const total = await tx.maintenanceOrderItem.aggregate({
        where: { companyId: principal.companyId, orderId: id },
        _sum: { totalCost: true },
      });
      const actualCost = total._sum.totalCost ?? 0;
      await tx.maintenanceOrder.update({
        where: { id, companyId: principal.companyId },
        data: {
          status: "COMPLETED",
          completedById: principal.userId,
          completedAt,
          downtimeEndedAt: completedAt,
          resolution: dto.resolution,
          invoiceNumber: dto.invoiceNumber,
          warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : undefined,
          actualCost,
        },
      });
      await tx.vehicle.updateMany({
        where: {
          id: order.vehicleId,
          companyId: principal.companyId,
          OR: [{ currentOdometer: null }, { currentOdometer: { lte: order.odometer } }],
        },
        data: { currentOdometer: order.odometer },
      });
      const otherActiveOrders = await tx.maintenanceOrder.count({
        where: {
          companyId: principal.companyId,
          vehicleId: order.vehicleId,
          id: { not: id },
          status: { in: ["APPROVED", "IN_PROGRESS", "PAUSED"] },
        },
      });
      if (!otherActiveOrders) {
        await tx.vehicle.update({
          where: { id: order.vehicleId, companyId: principal.companyId },
          data: { status: order.previousVehicleStatus ?? "AVAILABLE" },
        });
      }
      const month = new Date(completedAt.getFullYear(), completedAt.getMonth(), 1);
      await tx.vehicleCostAggregate.upsert({
        where: {
          vehicleId_costType_month: { vehicleId: order.vehicleId, costType: "WORKSHOP", month },
        },
        create: {
          companyId: principal.companyId,
          vehicleId: order.vehicleId,
          costType: "WORKSHOP",
          month,
          amount: actualCost,
        },
        update: { amount: { increment: actualCost } },
      });
      await tx.vehicleTimelineEvent.create({
        data: {
          companyId: principal.companyId,
          vehicleId: order.vehicleId,
          actorId: principal.userId,
          type: "MAINTENANCE",
          title: "Manutencao concluida",
          description: `${order.code} - ${dto.resolution}`,
          metadata: { orderId: id, actualCost: String(actualCost) },
        },
      });
      if (order.workshopId) {
        await tx.workshop.update({
          where: { id: order.workshopId, companyId: principal.companyId },
          data: { totalBilled: { increment: actualCost } },
        });
      }
      if (order.planId) {
        const plan = await tx.maintenancePlan.findFirst({
          where: { id: order.planId, companyId: principal.companyId },
        });
        if (plan)
          await tx.maintenancePlan.update({
            where: { id: plan.id },
            data: {
              lastPerformedAt: completedAt,
              lastOdometer: order.odometer,
              nextDueAt: plan.intervalDays
                ? new Date(completedAt.getTime() + plan.intervalDays * 86_400_000)
                : null,
              nextDueOdometer: plan.intervalKm
                ? Number(order.odometer) + Number(plan.intervalKm)
                : null,
            },
          });
      }
      return Number(actualCost);
    });
    await this.transition(order, "COMPLETED", principal, device, dto.resolution);
    await this.events.publish({
      name: "MaintenanceOrderCompleted",
      aggregateType: "MaintenanceOrder",
      aggregateId: id,
      companyId: principal.companyId,
      payload: { vehicleId: order.vehicleId, actualCost: result },
    });
    return { completed: true, actualCost: result };
  }

  private async requireOrder(principal: RequestPrincipal, id: string) {
    const order = (await this.repository.findById(principal.companyId, id)) as OrderRecord | null;
    if (!order || (principal.branchId && order.branchId !== principal.branchId))
      throw new NotFoundException("Maintenance order not found");
    return order;
  }
  private async requireVehicle(principal: RequestPrincipal, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId: principal.companyId, archivedAt: null },
    });
    if (!vehicle || (principal.branchId && vehicle.branchId !== principal.branchId))
      throw new NotFoundException("Vehicle not found");
    return vehicle;
  }
  private async transition(
    order: OrderRecord,
    status: string,
    principal: RequestPrincipal,
    device?: RequestDevice,
    reason?: string,
  ) {
    await this.record("UPDATE", "MaintenanceOrder", order.id, principal, device, {
      from: order.status,
      to: status,
      reason,
    });
    await this.events.publish({
      name: `MaintenanceOrder${status.replaceAll("_", "")}`,
      aggregateType: "MaintenanceOrder",
      aggregateId: order.id,
      companyId: principal.companyId,
      payload: { vehicleId: order.vehicleId, from: order.status, to: status },
    });
  }
  private record(
    action: "CREATE" | "UPDATE",
    tableName: string,
    recordId: string,
    principal: RequestPrincipal,
    device: RequestDevice | undefined,
    newValue: Record<string, unknown>,
  ) {
    return this.audit.record({
      action,
      tableName,
      recordId,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: newValue as Prisma.InputJsonObject,
      device,
    });
  }
  private response(order: OrderRecord) {
    return {
      ...order,
      odometer: Number(order.odometer),
      estimatedCost: num(order.estimatedCost),
      actualCost: Number(order.actualCost),
      vehicle: { ...order.vehicle, currentOdometer: num(order.vehicle.currentOdometer) },
      items: order.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        totalCost: Number(item.totalCost),
      })),
    };
  }
}
