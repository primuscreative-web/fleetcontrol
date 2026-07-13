import type { Prisma, TireCondition, TireStatus } from "@fleetcontrol/database";
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
  CompleteRetreadDto,
  CreateTireDto,
  InspectTireDto,
  InstallTireDto,
  ListTiresQueryDto,
  RemoveTireDto,
  RequestRetreadDto,
  RotateTireDto,
  ScrapTireDto,
} from "../presentation/tires.dto";
import { TIRES_REPOSITORY, type TiresRepository } from "./tires.repository";
type TireRecord = Prisma.TireGetPayload<{
  include: { currentVehicle: true; movements: true; inspections: true; retreads: true };
}>;
const num = (value: unknown) => (value == null ? null : Number(value));
@Injectable()
export class TiresService {
  constructor(
    @Inject(TIRES_REPOSITORY) private readonly repository: TiresRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}
  async list(principal: RequestPrincipal, query: ListTiresQueryDto) {
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
      data: result.data.map((item) => this.response(item as TireRecord)),
      pagination: {
        page,
        pageSize,
        total: result.total,
        pageCount: Math.ceil(result.total / pageSize),
      },
    };
  }
  async get(principal: RequestPrincipal, id: string) {
    return this.response(await this.requireTire(principal, id));
  }
  async dashboard(principal: RequestPrincipal) {
    const scope = {
      companyId: principal.companyId,
      branchId: principal.branchId,
      archivedAt: null,
    };
    const [stock, installed, attention, retread, totals] = await this.prisma.$transaction([
      this.prisma.tire.count({ where: { ...scope, status: "IN_STOCK" } }),
      this.prisma.tire.count({ where: { ...scope, status: "INSTALLED" } }),
      this.prisma.tire.count({
        where: {
          ...scope,
          condition: { in: ["CRITICAL", "CONDEMNED"] },
          status: { notIn: ["SCRAPPED", "LOST"] },
        },
      }),
      this.prisma.tire.count({ where: { ...scope, status: "IN_RETREAD" } }),
      this.prisma.tire.aggregate({
        where: scope,
        _sum: { totalLifecycleCost: true, accumulatedKm: true },
        _avg: { currentTreadDepthMm: true },
      }),
    ]);
    const cost = Number(totals._sum.totalLifecycleCost ?? 0);
    const km = Number(totals._sum.accumulatedKm ?? 0);
    return {
      inStock: stock,
      installed,
      attention,
      inRetread: retread,
      lifecycleCost: cost,
      accumulatedKm: km,
      costPerKm: km > 0 ? cost / km : 0,
      averageTreadDepthMm: Number(totals._avg.currentTreadDepthMm ?? 0),
    };
  }
  async options(principal: RequestPrincipal) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { companyId: principal.companyId, branchId: principal.branchId, archivedAt: null },
      select: { id: true, plate: true, currentOdometer: true, status: true },
      orderBy: { plate: "asc" },
    });
    return {
      vehicles: vehicles.map((v) => ({ ...v, currentOdometer: num(v.currentOdometer) })),
      positions: [
        "FRONT_LEFT",
        "FRONT_RIGHT",
        "REAR_LEFT_OUTER",
        "REAR_LEFT_INNER",
        "REAR_RIGHT_INNER",
        "REAR_RIGHT_OUTER",
        "SPARE_1",
        "SPARE_2",
      ],
      statuses: ["IN_STOCK", "INSTALLED", "IN_REPAIR", "IN_RETREAD", "SCRAPPED", "LOST"],
      conditions: ["NEW", "GOOD", "FAIR", "CRITICAL", "CONDEMNED"],
    };
  }
  async create(principal: RequestPrincipal, dto: CreateTireDto, device?: RequestDevice) {
    const branchId = dto.branchId ?? principal.branchId;
    await this.ensureBranch(principal, branchId);
    const cost = dto.purchaseCost ?? 0;
    const tire = (await this.repository.create({
      company: { connect: { id: principal.companyId } },
      branch: branchId ? { connect: { id: branchId } } : undefined,
      serialNumber: dto.serialNumber.trim(),
      fireNumber: dto.fireNumber,
      brand: dto.brand.trim(),
      model: dto.model.trim(),
      size: dto.size.trim(),
      dot: dto.dot,
      loadIndex: dto.loadIndex,
      speedIndex: dto.speedIndex,
      manufacturerAt: dto.manufacturerAt ? new Date(dto.manufacturerAt) : undefined,
      purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : undefined,
      purchaseCost: dto.purchaseCost,
      supplierName: dto.supplierName,
      invoiceNumber: dto.invoiceNumber,
      warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : undefined,
      initialTreadDepthMm: dto.initialTreadDepthMm,
      currentTreadDepthMm: dto.initialTreadDepthMm,
      minimumTreadDepthMm: dto.minimumTreadDepthMm,
      recommendedPressurePsi: dto.recommendedPressurePsi,
      maxRetreads: dto.maxRetreads,
      totalLifecycleCost: cost,
      notes: dto.notes,
      movements: {
        create: {
          companyId: principal.companyId,
          createdById: principal.userId,
          type: "PURCHASE",
          occurredAt: dto.purchasedAt ? new Date(dto.purchasedAt) : new Date(),
          cost,
          reason: "Asset registration",
        },
      },
    })) as TireRecord;
    await this.record("CREATE", tire.id, principal, device, {
      serialNumber: tire.serialNumber,
      brand: tire.brand,
      purchaseCost: cost,
    });
    await this.events.publish({
      name: "TireRegistered",
      aggregateType: "Tire",
      aggregateId: tire.id,
      companyId: principal.companyId,
      payload: { serialNumber: tire.serialNumber },
    });
    return this.response(tire);
  }
  async install(
    principal: RequestPrincipal,
    id: string,
    dto: InstallTireDto,
    device?: RequestDevice,
  ) {
    const tire = await this.requireTire(principal, id);
    if (!(["IN_STOCK", "IN_REPAIR"] as TireStatus[]).includes(tire.status))
      throw new ConflictException("Tire is not available for installation");
    if (tire.condition === "CONDEMNED")
      throw new BadRequestException("Condemned tire cannot be installed");
    const vehicle = await this.requireVehicle(principal, dto.vehicleId);
    if (
      await this.prisma.tire.count({
        where: {
          companyId: principal.companyId,
          currentVehicleId: vehicle.id,
          currentPosition: dto.position,
          status: "INSTALLED",
        },
      })
    )
      throw new ConflictException("Vehicle position is already occupied");
    const firstInstallation = !(await this.prisma.tireMovement.count({
      where: { companyId: principal.companyId, tireId: id, type: "INSTALL" },
    }));
    const unallocatedRetreads = await this.prisma.tireRetread.aggregate({
      where: {
        companyId: principal.companyId,
        tireId: id,
        status: "COMPLETED",
        costAllocatedAt: null,
      },
      _sum: { cost: true },
    });
    const retreadCost = Number(unallocatedRetreads._sum.cost ?? 0);
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.tire.update({
        where: { id, companyId: principal.companyId },
        data: {
          status: "INSTALLED",
          currentVehicleId: vehicle.id,
          currentPosition: dto.position,
          installedAt: occurredAt,
          installedOdometer: dto.odometer,
          branchId: vehicle.branchId,
        },
      });
      await tx.tireMovement.create({
        data: {
          companyId: principal.companyId,
          tireId: id,
          toVehicleId: vehicle.id,
          createdById: principal.userId,
          type: "INSTALL",
          toPosition: dto.position,
          odometer: dto.odometer,
          occurredAt,
          reason: dto.reason,
        },
      });
      await tx.vehicleTimelineEvent.create({
        data: {
          companyId: principal.companyId,
          vehicleId: vehicle.id,
          actorId: principal.userId,
          type: "TIRE",
          title: "Pneu instalado",
          description: `${tire.serialNumber} · ${dto.position}`,
          metadata: { tireId: id },
        },
      });
      const allocatableCost =
        (firstInstallation ? Number(tire.purchaseCost ?? 0) : 0) + retreadCost;
      if (allocatableCost > 0)
        await this.addVehicleCost(tx, principal.companyId, vehicle.id, occurredAt, allocatableCost);
      if (retreadCost > 0)
        await tx.tireRetread.updateMany({
          where: {
            companyId: principal.companyId,
            tireId: id,
            status: "COMPLETED",
            costAllocatedAt: null,
          },
          data: { costAllocatedAt: occurredAt },
        });
    });
    await this.record("UPDATE", id, principal, device, {
      action: "INSTALL",
      vehicleId: vehicle.id,
      position: dto.position,
    });
    await this.events.publish({
      name: "TireInstalled",
      aggregateType: "Tire",
      aggregateId: id,
      companyId: principal.companyId,
      payload: { vehicleId: vehicle.id, position: dto.position },
    });
    return { installed: true };
  }
  async remove(
    principal: RequestPrincipal,
    id: string,
    dto: RemoveTireDto,
    device?: RequestDevice,
  ) {
    const tire = await this.requireTire(principal, id);
    if (tire.status !== "INSTALLED" || !tire.currentVehicleId)
      throw new ConflictException("Tire is not installed");
    const installedOdometer = num(tire.installedOdometer);
    if (installedOdometer != null && dto.odometer < installedOdometer)
      throw new BadRequestException("Removal odometer cannot precede installation");
    const distance = installedOdometer == null ? 0 : dto.odometer - installedOdometer;
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const vehicleId = tire.currentVehicleId;
    await this.prisma.$transaction([
      this.prisma.tire.update({
        where: { id, companyId: principal.companyId },
        data: {
          status: dto.nextStatus ?? "IN_STOCK",
          currentVehicleId: null,
          currentPosition: null,
          installedAt: null,
          installedOdometer: null,
          accumulatedKm: { increment: distance },
        },
      }),
      this.prisma.tireMovement.create({
        data: {
          companyId: principal.companyId,
          tireId: id,
          fromVehicleId: vehicleId,
          createdById: principal.userId,
          type: "REMOVE",
          fromPosition: tire.currentPosition,
          odometer: dto.odometer,
          occurredAt,
          reason: dto.reason,
          metadata: { distance },
        },
      }),
      this.prisma.vehicleTimelineEvent.create({
        data: {
          companyId: principal.companyId,
          vehicleId,
          actorId: principal.userId,
          type: "TIRE",
          title: "Pneu removido",
          description: `${tire.serialNumber} · ${dto.reason}`,
          metadata: { tireId: id, distance },
        },
      }),
    ]);
    await this.record("UPDATE", id, principal, device, {
      action: "REMOVE",
      vehicleId,
      distance,
      reason: dto.reason,
    });
    await this.events.publish({
      name: "TireRemoved",
      aggregateType: "Tire",
      aggregateId: id,
      companyId: principal.companyId,
      payload: { vehicleId, distance, nextStatus: dto.nextStatus ?? "IN_STOCK" },
    });
    return { removed: true, distance };
  }
  async rotate(
    principal: RequestPrincipal,
    id: string,
    dto: RotateTireDto,
    device?: RequestDevice,
  ) {
    const tire = await this.requireTire(principal, id);
    if (tire.status !== "INSTALLED" || !tire.currentVehicleId)
      throw new ConflictException("Tire is not installed");
    if (dto.position === tire.currentPosition)
      throw new BadRequestException("New position must be different");
    if (
      await this.prisma.tire.count({
        where: {
          companyId: principal.companyId,
          currentVehicleId: tire.currentVehicleId,
          currentPosition: dto.position,
          status: "INSTALLED",
        },
      })
    )
      throw new ConflictException("Vehicle position is already occupied");
    await this.prisma.$transaction([
      this.prisma.tire.update({
        where: { id, companyId: principal.companyId },
        data: { currentPosition: dto.position },
      }),
      this.prisma.tireMovement.create({
        data: {
          companyId: principal.companyId,
          tireId: id,
          fromVehicleId: tire.currentVehicleId,
          toVehicleId: tire.currentVehicleId,
          createdById: principal.userId,
          type: "ROTATE",
          fromPosition: tire.currentPosition,
          toPosition: dto.position,
          odometer: dto.odometer,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
          reason: dto.reason,
        },
      }),
    ]);
    await this.record("UPDATE", id, principal, device, {
      action: "ROTATE",
      from: tire.currentPosition,
      to: dto.position,
    });
    await this.events.publish({
      name: "TireRotated",
      aggregateType: "Tire",
      aggregateId: id,
      companyId: principal.companyId,
      payload: { vehicleId: tire.currentVehicleId, from: tire.currentPosition, to: dto.position },
    });
    return { rotated: true };
  }
  async inspect(
    principal: RequestPrincipal,
    id: string,
    dto: InspectTireDto,
    device?: RequestDevice,
  ) {
    const tire = await this.requireTire(principal, id);
    const depths = [dto.treadDepthInnerMm, dto.treadDepthCenterMm, dto.treadDepthOuterMm].filter(
      (v): v is number => v != null,
    );
    if (!depths.length && dto.pressurePsi == null && !dto.hasDamage)
      throw new BadRequestException("Inspection must contain a measurement or damage finding");
    const average = depths.length
      ? depths.reduce((a, b) => a + b, 0) / depths.length
      : num(tire.currentTreadDepthMm);
    const minimum = Number(tire.minimumTreadDepthMm);
    const condition: TireCondition =
      dto.hasDamage || (average != null && average <= minimum)
        ? "CONDEMNED"
        : average != null && average <= minimum + 1
          ? "CRITICAL"
          : dto.irregularWear
            ? "FAIR"
            : average != null && average < 5
              ? "FAIR"
              : "GOOD";
    const inspection = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tireInspection.create({
        data: {
          companyId: principal.companyId,
          tireId: id,
          vehicleId: tire.currentVehicleId,
          createdById: principal.userId,
          inspectedAt: dto.inspectedAt ? new Date(dto.inspectedAt) : new Date(),
          odometer: dto.odometer,
          pressurePsi: dto.pressurePsi,
          treadDepthInnerMm: dto.treadDepthInnerMm,
          treadDepthCenterMm: dto.treadDepthCenterMm,
          treadDepthOuterMm: dto.treadDepthOuterMm,
          averageTreadDepthMm: average,
          condition,
          irregularWear: dto.irregularWear,
          hasDamage: dto.hasDamage,
          recommendedAction: dto.recommendedAction,
          photoStorageKey: dto.photoStorageKey,
          photoUrl: dto.photoUrl,
          notes: dto.notes,
        },
      });
      await tx.tire.update({
        where: { id, companyId: principal.companyId },
        data: { condition, currentTreadDepthMm: average },
      });
      return created;
    });
    await this.record("UPDATE", id, principal, device, {
      action: "INSPECT",
      condition,
      averageTreadDepthMm: average,
    });
    await this.events.publish({
      name: "TireInspected",
      aggregateType: "Tire",
      aggregateId: id,
      companyId: principal.companyId,
      payload: { condition, vehicleId: tire.currentVehicleId },
    });
    if (["CRITICAL", "CONDEMNED"].includes(condition))
      await this.notifications.create({
        companyId: principal.companyId,
        userId: principal.userId,
        channel: "INTERNAL",
        category: "tires.safety",
        title: "Pneu requer acao imediata",
        body: `${tire.serialNumber}: condicao ${condition}`,
        priority: condition === "CONDEMNED" ? "CRITICAL" : "HIGH",
        metadata: { tireId: id, inspectionId: inspection.id, vehicleId: tire.currentVehicleId },
      });
    return { ...inspection, averageTreadDepthMm: num(inspection.averageTreadDepthMm) };
  }
  async requestRetread(
    principal: RequestPrincipal,
    id: string,
    dto: RequestRetreadDto,
    device?: RequestDevice,
  ) {
    const tire = await this.requireTire(principal, id);
    if (tire.status === "INSTALLED") throw new ConflictException("Remove tire before retread");
    if (["SCRAPPED", "LOST", "IN_RETREAD"].includes(tire.status))
      throw new ConflictException("Tire cannot be retread in current status");
    if (tire.retreadCount >= tire.maxRetreads)
      throw new BadRequestException("Maximum retread count reached");
    const retread = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tireRetread.create({
        data: {
          companyId: principal.companyId,
          tireId: id,
          createdById: principal.userId,
          providerName: dto.providerName,
          cost: dto.cost,
          notes: dto.notes,
          status: "SENT",
          sentAt: new Date(),
        },
      });
      await tx.tire.update({
        where: { id, companyId: principal.companyId },
        data: { status: "IN_RETREAD" },
      });
      await tx.tireMovement.create({
        data: {
          companyId: principal.companyId,
          tireId: id,
          createdById: principal.userId,
          type: "RETREAD",
          reason: `Sent to ${dto.providerName}`,
          cost: dto.cost,
        },
      });
      return created;
    });
    await this.record("UPDATE", id, principal, device, {
      action: "RETREAD_REQUEST",
      retreadId: retread.id,
      provider: dto.providerName,
    });
    await this.events.publish({
      name: "TireRetreadRequested",
      aggregateType: "Tire",
      aggregateId: id,
      companyId: principal.companyId,
      payload: { retreadId: retread.id, provider: dto.providerName },
    });
    return retread;
  }
  async completeRetread(
    principal: RequestPrincipal,
    id: string,
    retreadId: string,
    dto: CompleteRetreadDto,
    device?: RequestDevice,
  ) {
    const tire = await this.requireTire(principal, id);
    const retread = await this.prisma.tireRetread.findFirst({
      where: {
        id: retreadId,
        tireId: id,
        companyId: principal.companyId,
        status: { in: ["SENT", "IN_PROGRESS"] },
      },
    });
    if (!retread || tire.status !== "IN_RETREAD")
      throw new NotFoundException("Active retread not found");
    const completedAt = dto.completedAt ? new Date(dto.completedAt) : new Date();
    await this.prisma.$transaction([
      this.prisma.tireRetread.update({
        where: { id: retreadId },
        data: {
          status: "COMPLETED",
          completedAt,
          cost: dto.cost,
          newTreadDepthMm: dto.newTreadDepthMm,
          warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : undefined,
          invoiceNumber: dto.invoiceNumber,
        },
      }),
      this.prisma.tire.update({
        where: { id, companyId: principal.companyId },
        data: {
          status: "IN_STOCK",
          condition: "GOOD",
          retreadCount: { increment: 1 },
          currentTreadDepthMm: dto.newTreadDepthMm,
          totalLifecycleCost: { increment: dto.cost },
          warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : undefined,
        },
      }),
    ]);
    await this.record("UPDATE", id, principal, device, {
      action: "RETREAD_COMPLETE",
      retreadId,
      cost: dto.cost,
    });
    await this.events.publish({
      name: "TireRetreadCompleted",
      aggregateType: "Tire",
      aggregateId: id,
      companyId: principal.companyId,
      payload: { retreadId, cost: dto.cost },
    });
    return { completed: true };
  }
  async scrap(principal: RequestPrincipal, id: string, dto: ScrapTireDto, device?: RequestDevice) {
    const tire = await this.requireTire(principal, id);
    if (tire.status === "INSTALLED") throw new ConflictException("Remove tire before scrapping");
    if (tire.status === "SCRAPPED") throw new ConflictException("Tire is already scrapped");
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    await this.prisma.$transaction([
      this.prisma.tire.update({
        where: { id, companyId: principal.companyId },
        data: {
          status: "SCRAPPED",
          condition: "CONDEMNED",
          scrappedAt: occurredAt,
          scrapReason: dto.reason,
        },
      }),
      this.prisma.tireMovement.create({
        data: {
          companyId: principal.companyId,
          tireId: id,
          createdById: principal.userId,
          type: "SCRAP",
          occurredAt,
          reason: dto.reason,
        },
      }),
    ]);
    await this.record("UPDATE", id, principal, device, { action: "SCRAP", reason: dto.reason });
    await this.events.publish({
      name: "TireScrapped",
      aggregateType: "Tire",
      aggregateId: id,
      companyId: principal.companyId,
      payload: { reason: dto.reason },
    });
    return { scrapped: true };
  }
  private async requireTire(principal: RequestPrincipal, id: string) {
    const tire = (await this.repository.findById(principal.companyId, id)) as TireRecord | null;
    if (!tire || (principal.branchId && tire.branchId !== principal.branchId))
      throw new NotFoundException("Tire not found");
    return tire;
  }
  private async requireVehicle(principal: RequestPrincipal, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId: principal.companyId, branchId: principal.branchId, archivedAt: null },
    });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    return vehicle;
  }
  private async ensureBranch(principal: RequestPrincipal, id?: string) {
    if (
      id &&
      ((principal.branchId && principal.branchId !== id) ||
        !(await this.prisma.branch.count({ where: { id, companyId: principal.companyId } })))
    )
      throw new BadRequestException("Invalid branch for company scope");
  }
  private addVehicleCost(
    tx: Prisma.TransactionClient,
    companyId: string,
    vehicleId: string,
    date: Date,
    amount: number,
  ) {
    const month = new Date(date.getFullYear(), date.getMonth(), 1);
    return tx.vehicleCostAggregate.upsert({
      where: { vehicleId_costType_month: { vehicleId, costType: "TIRES", month } },
      create: { companyId, vehicleId, costType: "TIRES", month, amount },
      update: { amount: { increment: amount } },
    });
  }
  private record(
    action: "CREATE" | "UPDATE",
    recordId: string,
    principal: RequestPrincipal,
    device: RequestDevice | undefined,
    value: Record<string, unknown>,
  ) {
    return this.audit.record({
      action,
      tableName: "Tire",
      recordId,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: value as Prisma.InputJsonObject,
      device,
    });
  }
  private response(tire: TireRecord) {
    return {
      ...tire,
      purchaseCost: num(tire.purchaseCost),
      installedOdometer: num(tire.installedOdometer),
      accumulatedKm: Number(tire.accumulatedKm),
      initialTreadDepthMm: num(tire.initialTreadDepthMm),
      currentTreadDepthMm: num(tire.currentTreadDepthMm),
      minimumTreadDepthMm: Number(tire.minimumTreadDepthMm),
      recommendedPressurePsi: num(tire.recommendedPressurePsi),
      totalLifecycleCost: Number(tire.totalLifecycleCost),
      costPerKm:
        Number(tire.accumulatedKm) > 0
          ? Number(tire.totalLifecycleCost) / Number(tire.accumulatedKm)
          : 0,
      movements: tire.movements?.map((v) => ({
        ...v,
        odometer: num(v.odometer),
        cost: Number(v.cost),
      })),
      inspections: tire.inspections?.map((v) => ({
        ...v,
        odometer: num(v.odometer),
        pressurePsi: num(v.pressurePsi),
        averageTreadDepthMm: num(v.averageTreadDepthMm),
      })),
      retreads: tire.retreads?.map((v) => ({
        ...v,
        cost: Number(v.cost),
        newTreadDepthMm: num(v.newTreadDepthMm),
      })),
    };
  }
}
