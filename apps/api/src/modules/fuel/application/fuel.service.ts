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
  CreateFuelingDto,
  CreateFuelPriceDto,
  CreateFuelStationDto,
  ListFuelingsQueryDto,
  ReviewFuelingDto,
} from "../presentation/fuel.dto";
import { FUEL_REPOSITORY, type FuelRepository } from "./fuel.repository";
@Injectable()
export class FuelService {
  constructor(
    @Inject(FUEL_REPOSITORY) private readonly repository: FuelRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}
  async list(principal: RequestPrincipal, query: ListFuelingsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const result = await this.repository.list({
      companyId: principal.companyId,
      branchId: principal.branchId,
      search: query.search,
      status: query.status,
      vehicleId: query.vehicleId,
      stationId: query.stationId,
      page,
      pageSize,
    });
    return {
      data: result.data.map((item) => this.response(item as FuelingRecord)),
      pagination: {
        page,
        pageSize,
        total: result.total,
        pageCount: Math.ceil(result.total / pageSize),
      },
    };
  }
  async dashboard(principal: RequestPrincipal) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const where = {
      companyId: principal.companyId,
      branchId: principal.branchId,
      fueledAt: { gte: start },
    };
    const [approved, pending, anomalies, aggregates, consumption] = await this.prisma.$transaction([
      this.prisma.fueling.count({ where: { ...where, status: "APPROVED" } }),
      this.prisma.fueling.count({ where: { ...where, status: "PENDING" } }),
      this.prisma.fueling.count({ where: { ...where, anomaly: true } }),
      this.prisma.fueling.aggregate({
        where: { ...where, status: "APPROVED" },
        _sum: { liters: true, totalAmount: true },
        _avg: { unitPrice: true },
      }),
      this.prisma.fueling.aggregate({
        where: { ...where, status: "APPROVED", consumptionKmPerL: { not: null } },
        _avg: { consumptionKmPerL: true },
      }),
    ]);
    return {
      approved,
      pending,
      anomalies,
      liters: Number(aggregates._sum.liters ?? 0),
      totalAmount: Number(aggregates._sum.totalAmount ?? 0),
      averageUnitPrice: Number(aggregates._avg.unitPrice ?? 0),
      averageConsumption: Number(consumption._avg.consumptionKmPerL ?? 0),
    };
  }
  async options(principal: RequestPrincipal) {
    const [stations, vehicles, drivers] = await this.prisma.$transaction([
      this.prisma.fuelStation.findMany({
        where: { companyId: principal.companyId, active: true, archivedAt: null },
        orderBy: { name: "asc" },
      }),
      this.prisma.vehicle.findMany({
        where: { companyId: principal.companyId, archivedAt: null },
        select: { id: true, plate: true, fuelType: true, currentOdometer: true },
        orderBy: { plate: "asc" },
      }),
      this.prisma.driver.findMany({
        where: { companyId: principal.companyId, status: "ACTIVE", archivedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return {
      stations: stations.map((item) => ({
        ...item,
        latitude: number(item.latitude),
        longitude: number(item.longitude),
      })),
      vehicles: vehicles.map((item) => ({
        ...item,
        currentOdometer: number(item.currentOdometer),
      })),
      drivers,
      fuelTypes: [
        "GASOLINE",
        "ETHANOL",
        "FLEX",
        "DIESEL",
        "BIODIESEL",
        "ELECTRIC",
        "HYBRID",
        "CNG",
        "OTHER",
      ],
    };
  }
  async stations(principal: RequestPrincipal) {
    const data = await this.prisma.fuelStation.findMany({
      where: { companyId: principal.companyId, archivedAt: null },
      include: { prices: { orderBy: { effectiveAt: "desc" }, take: 10 } },
      orderBy: { name: "asc" },
    });
    return data.map((item) => ({
      ...item,
      latitude: number(item.latitude),
      longitude: number(item.longitude),
      prices: item.prices.map((price) => ({ ...price, price: Number(price.price) })),
    }));
  }
  async createStation(
    principal: RequestPrincipal,
    dto: CreateFuelStationDto,
    device?: RequestDevice,
  ) {
    await this.ensureBranch(principal.companyId, dto.branchId);
    const station = await this.prisma.fuelStation.create({
      data: {
        companyId: principal.companyId,
        branchId: dto.branchId,
        name: dto.name.trim(),
        legalName: dto.legalName,
        document: dto.document,
        code: dto.code,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        latitude: dto.latitude,
        longitude: dto.longitude,
        notes: dto.notes,
      },
    });
    await this.audit.record({
      action: "CREATE",
      tableName: "FuelStation",
      recordId: station.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: { name: station.name, code: station.code },
      device,
    });
    await this.events.publish({
      name: "FuelStationCreated",
      aggregateType: "FuelStation",
      aggregateId: station.id,
      companyId: principal.companyId,
      payload: { name: station.name },
    });
    return station;
  }
  async addPrice(
    principal: RequestPrincipal,
    stationId: string,
    dto: CreateFuelPriceDto,
    device?: RequestDevice,
  ) {
    const station = await this.prisma.fuelStation.findFirst({
      where: { id: stationId, companyId: principal.companyId, archivedAt: null },
    });
    if (!station) throw new NotFoundException("Fuel station not found");
    const price = await this.prisma.fuelPrice.create({
      data: {
        companyId: principal.companyId,
        stationId,
        fuelType: dto.fuelType,
        price: dto.price,
        effectiveAt: new Date(dto.effectiveAt),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdById: principal.userId,
      },
    });
    await this.audit.record({
      action: "CREATE",
      tableName: "FuelPrice",
      recordId: price.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: { stationId, fuelType: dto.fuelType, price: dto.price },
      device,
    });
    return { ...price, price: Number(price.price) };
  }
  async createFueling(principal: RequestPrincipal, dto: CreateFuelingDto, device?: RequestDevice) {
    const [station, vehicle, driver, previous, officialPrice] = await Promise.all([
      this.prisma.fuelStation.findFirst({
        where: {
          id: dto.stationId,
          companyId: principal.companyId,
          active: true,
          archivedAt: null,
        },
      }),
      this.prisma.vehicle.findFirst({
        where: { id: dto.vehicleId, companyId: principal.companyId, archivedAt: null },
      }),
      dto.driverId
        ? this.prisma.driver.findFirst({
            where: {
              id: dto.driverId,
              companyId: principal.companyId,
              status: "ACTIVE",
              archivedAt: null,
            },
          })
        : Promise.resolve(null),
      this.prisma.fueling.findFirst({
        where: {
          companyId: principal.companyId,
          vehicleId: dto.vehicleId,
          status: "APPROVED",
          fueledAt: { lt: new Date(dto.fueledAt) },
        },
        orderBy: { fueledAt: "desc" },
      }),
      this.prisma.fuelPrice.findFirst({
        where: {
          companyId: principal.companyId,
          stationId: dto.stationId,
          fuelType: dto.fuelType,
          effectiveAt: { lte: new Date(dto.fueledAt) },
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date(dto.fueledAt) } }],
        },
        orderBy: { effectiveAt: "desc" },
      }),
    ]);
    if (!station || !vehicle || (dto.driverId && !driver))
      throw new BadRequestException("Invalid fueling reference for company scope");
    if (
      dto.externalId &&
      (await this.prisma.fueling.count({
        where: { companyId: principal.companyId, externalId: dto.externalId },
      }))
    )
      throw new ConflictException("Fueling external id already exists");
    const previousOdometer = previous ? Number(previous.odometer) : number(vehicle.currentOdometer);
    const distance = previousOdometer == null ? null : dto.odometer - previousOdometer;
    const expectedTotal = dto.liters * dto.unitPrice;
    const reasons: string[] = [];
    if (distance != null && distance < 0) reasons.push("Odometer rollback");
    if (Math.abs(expectedTotal - dto.totalAmount) > Math.max(1, expectedTotal * 0.01))
      reasons.push("Total differs from liters x unit price");
    if (
      officialPrice &&
      Math.abs(Number(officialPrice.price) - dto.unitPrice) / Number(officialPrice.price) > 0.1
    )
      reasons.push("Unit price differs more than 10% from station price");
    if (
      vehicle.fuelType &&
      vehicle.fuelType !== dto.fuelType &&
      vehicle.fuelType !== "FLEX" &&
      vehicle.fuelType !== "HYBRID"
    )
      reasons.push("Fuel type differs from vehicle");
    const consumption =
      dto.fullTank !== false && distance != null && distance > 0 ? distance / dto.liters : null;
    const fueling = (await this.repository.create({
      company: { connect: { id: principal.companyId } },
      branch: vehicle.branchId ? { connect: { id: vehicle.branchId } } : undefined,
      station: { connect: { id: station.id } },
      vehicle: { connect: { id: vehicle.id } },
      driver: driver ? { connect: { id: driver.id } } : undefined,
      createdBy: { connect: { id: principal.userId } },
      fuelType: dto.fuelType,
      source: dto.source,
      fueledAt: new Date(dto.fueledAt),
      odometer: dto.odometer,
      liters: dto.liters,
      unitPrice: dto.unitPrice,
      totalAmount: dto.totalAmount,
      previousOdometer,
      distanceTraveled: distance,
      consumptionKmPerL: consumption,
      fullTank: dto.fullTank ?? true,
      invoiceNumber: dto.invoiceNumber,
      externalId: dto.externalId,
      receiptStorageKey: dto.receiptStorageKey,
      receiptUrl: dto.receiptUrl,
      anomaly: reasons.length > 0,
      anomalyReason: reasons.join("; ") || undefined,
      notes: dto.notes,
    })) as FuelingRecord;
    await this.audit.record({
      action: "CREATE",
      tableName: "Fueling",
      recordId: fueling.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: {
        vehicleId: vehicle.id,
        stationId: station.id,
        liters: dto.liters,
        totalAmount: dto.totalAmount,
        anomaly: fueling.anomaly,
      },
      device,
    });
    await this.events.publish({
      name: "FuelingCreated",
      aggregateType: "Fueling",
      aggregateId: fueling.id,
      companyId: principal.companyId,
      payload: { vehicleId: vehicle.id, anomaly: fueling.anomaly },
    });
    if (fueling.anomaly)
      await this.notifications.create({
        companyId: principal.companyId,
        userId: principal.userId,
        channel: "INTERNAL",
        category: "fuel.anomaly",
        title: "Abastecimento com divergencia",
        body: `${vehicle.plate}: ${fueling.anomalyReason}`,
        priority: "HIGH",
        metadata: { fuelingId: fueling.id, vehicleId: vehicle.id },
      });
    return this.response(fueling);
  }
  async approve(
    principal: RequestPrincipal,
    id: string,
    dto: ReviewFuelingDto,
    device?: RequestDevice,
  ) {
    const fueling = await this.requireFueling(principal, id);
    if (fueling.status !== "PENDING") throw new ConflictException("Fueling is not pending");
    const month = new Date(fueling.fueledAt.getFullYear(), fueling.fueledAt.getMonth(), 1);
    const approvedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.fueling.update({
        where: { id, companyId: principal.companyId },
        data: {
          status: "APPROVED",
          approvedById: principal.userId,
          approvedAt,
          notes: dto.reason ? `${fueling.notes ?? ""}\nApproval: ${dto.reason}`.trim() : undefined,
        },
      }),
      this.prisma.vehicle.updateMany({
        where: {
          id: fueling.vehicleId,
          companyId: principal.companyId,
          OR: [{ currentOdometer: null }, { currentOdometer: { lte: fueling.odometer } }],
        },
        data: { currentOdometer: fueling.odometer },
      }),
      this.prisma.vehicleCostAggregate.upsert({
        where: {
          vehicleId_costType_month: { vehicleId: fueling.vehicleId, costType: "FUEL", month },
        },
        create: {
          companyId: principal.companyId,
          vehicleId: fueling.vehicleId,
          costType: "FUEL",
          month,
          amount: fueling.totalAmount,
          distance: fueling.distanceTraveled,
        },
        update: {
          amount: { increment: fueling.totalAmount },
          distance:
            fueling.distanceTraveled == null ? undefined : { increment: fueling.distanceTraveled },
        },
      }),
      this.prisma.vehicleTimelineEvent.create({
        data: {
          companyId: principal.companyId,
          vehicleId: fueling.vehicleId,
          actorId: principal.userId,
          type: "FUELING",
          title: "Abastecimento aprovado",
          description: `${Number(fueling.liters).toFixed(3)} L - R$ ${Number(fueling.totalAmount).toFixed(2)}`,
          metadata: { fuelingId: id },
        },
      }),
    ]);
    await this.audit.record({
      action: "UPDATE",
      tableName: "Fueling",
      recordId: id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { status: "PENDING" },
      newValue: { status: "APPROVED", approvedAt: approvedAt.toISOString() },
      device,
    });
    await this.events.publish({
      name: "FuelingApproved",
      aggregateType: "Fueling",
      aggregateId: id,
      companyId: principal.companyId,
      payload: { vehicleId: fueling.vehicleId, totalAmount: Number(fueling.totalAmount) },
    });
    return { approved: true };
  }
  async reject(
    principal: RequestPrincipal,
    id: string,
    dto: ReviewFuelingDto,
    device?: RequestDevice,
  ) {
    const fueling = await this.requireFueling(principal, id);
    if (fueling.status !== "PENDING") throw new ConflictException("Fueling is not pending");
    if (!dto.reason) throw new BadRequestException("Rejection reason is required");
    await this.prisma.fueling.update({
      where: { id, companyId: principal.companyId },
      data: {
        status: "REJECTED",
        approvedById: principal.userId,
        approvedAt: new Date(),
        rejectionReason: dto.reason,
      },
    });
    await this.audit.record({
      action: "UPDATE",
      tableName: "Fueling",
      recordId: id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { status: "PENDING" },
      newValue: { status: "REJECTED", reason: dto.reason },
      device,
    });
    await this.events.publish({
      name: "FuelingRejected",
      aggregateType: "Fueling",
      aggregateId: id,
      companyId: principal.companyId,
      payload: { reason: dto.reason },
    });
    return { rejected: true };
  }
  private async requireFueling(principal: RequestPrincipal, id: string) {
    const value = (await this.repository.findById(principal.companyId, id)) as FuelingRecord | null;
    if (!value || (principal.branchId && value.branchId && principal.branchId !== value.branchId))
      throw new NotFoundException("Fueling not found");
    return value;
  }
  private async ensureBranch(companyId: string, branchId?: string) {
    if (branchId && !(await this.prisma.branch.count({ where: { id: branchId, companyId } })))
      throw new BadRequestException("Invalid branch for company scope");
  }
  private response(value: FuelingRecord) {
    return {
      ...value,
      odometer: Number(value.odometer),
      liters: Number(value.liters),
      unitPrice: Number(value.unitPrice),
      totalAmount: Number(value.totalAmount),
      previousOdometer: number(value.previousOdometer),
      distanceTraveled: number(value.distanceTraveled),
      consumptionKmPerL: number(value.consumptionKmPerL),
    };
  }
}
const number = (value: unknown) => (value == null ? null : Number(value));
type FuelingRecord = Prisma.FuelingGetPayload<{
  include: { station: true; vehicle: true; driver: true; createdBy: true; approvedBy: true };
}>;
