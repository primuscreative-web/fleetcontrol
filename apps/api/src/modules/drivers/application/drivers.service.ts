import type { DriverStatus, Prisma } from "@fleetcontrol/database";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { RequestDevice, RequestPrincipal } from "../../../common/context/request-context";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { AuditService } from "../../audit/application/audit.service";
import { EventBusService } from "../../events/application/event-bus.service";
import { NotificationsService } from "../../notifications/application/notifications.service";
import type {
  ArchiveDriverDto,
  AssignVehicleDto,
  ChangeDriverStatusDto,
  CreateDriverDocumentDto,
  CreateDriverDto,
  ListDriversQueryDto,
  UnassignVehicleDto,
  UpdateDriverDto,
} from "../presentation/drivers.dto";
import { DRIVERS_REPOSITORY, type DriversRepository } from "./drivers.repository";

const statuses: Record<DriverStatus, string> = {
  ACTIVE: "Ativo",
  ON_LEAVE: "Afastado",
  SUSPENDED: "Suspenso",
  INACTIVE: "Inativo",
  TERMINATED: "Desligado",
};

@Injectable()
export class DriversService {
  constructor(
    @Inject(DRIVERS_REPOSITORY) private readonly repository: DriversRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(principal: RequestPrincipal, query: ListDriversQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const result = await this.repository.list({
      companyId: principal.companyId,
      branchId: query.branchId ?? principal.branchId,
      departmentId: query.departmentId ?? principal.departmentId,
      search: query.search,
      status: query.status,
      page,
      pageSize,
    });
    return {
      data: result.data,
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
    const inThirtyDays = new Date(now);
    inThirtyDays.setDate(now.getDate() + 30);
    const scope = this.scope(principal);
    const [active, onLeave, suspended, expiredCnh, expiringCnh, withoutVehicle, expiringMedical] =
      await this.prisma.$transaction([
        this.prisma.driver.count({ where: { ...scope, status: "ACTIVE", archivedAt: null } }),
        this.prisma.driver.count({ where: { ...scope, status: "ON_LEAVE", archivedAt: null } }),
        this.prisma.driver.count({ where: { ...scope, status: "SUSPENDED", archivedAt: null } }),
        this.prisma.driver.count({
          where: { ...scope, cnhExpiresAt: { lt: now }, archivedAt: null },
        }),
        this.prisma.driver.count({
          where: { ...scope, cnhExpiresAt: { gte: now, lte: inThirtyDays }, archivedAt: null },
        }),
        this.prisma.driver.count({
          where: {
            ...scope,
            status: "ACTIVE",
            archivedAt: null,
            assignments: { none: { endsAt: null } },
          },
        }),
        this.prisma.driver.count({
          where: {
            ...scope,
            medicalExamExpiresAt: { gte: now, lte: inThirtyDays },
            archivedAt: null,
          },
        }),
      ]);
    return { active, onLeave, suspended, expiredCnh, expiringCnh, withoutVehicle, expiringMedical };
  }

  async options(principal: RequestPrincipal) {
    const [branches, departments, vehicles] = await this.prisma.$transaction([
      this.prisma.branch.findMany({
        where: { companyId: principal.companyId },
        orderBy: { name: "asc" },
      }),
      this.prisma.department.findMany({
        where: { companyId: principal.companyId },
        orderBy: { name: "asc" },
      }),
      this.prisma.vehicle.findMany({
        where: { companyId: principal.companyId, archivedAt: null },
        select: { id: true, plate: true, status: true },
        orderBy: { plate: "asc" },
      }),
    ]);
    return {
      statuses: Object.entries(statuses).map(([value, label]) => ({ value, label })),
      branches,
      departments,
      vehicles,
    };
  }

  async get(principal: RequestPrincipal, id: string) {
    return this.requireDriver(principal, id);
  }

  async create(principal: RequestPrincipal, dto: CreateDriverDto, device?: RequestDevice) {
    await this.validateReferences(principal.companyId, dto.branchId, dto.departmentId, dto.userId);
    const driver = (await this.repository.create(
      this.toCreateInput(principal.companyId, dto),
    )) as DriverRecord;
    await this.timeline(driver.id, principal, "CREATED", "Motorista cadastrado");
    await this.audit.record({
      action: "CREATE",
      tableName: "Driver",
      recordId: driver.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: this.auditValue(driver),
      device,
    });
    await this.publish("DriverCreated", driver, {
      name: driver.name,
      cnhExpiresAt: driver.cnhExpiresAt.toISOString(),
    });
    await this.notifyExpiry(principal, driver);
    return driver;
  }

  async update(
    principal: RequestPrincipal,
    id: string,
    dto: UpdateDriverDto,
    device?: RequestDevice,
  ) {
    const current = await this.requireDriver(principal, id);
    await this.validateReferences(principal.companyId, dto.branchId, dto.departmentId, dto.userId);
    const driver = (await this.repository.update(
      principal.companyId,
      id,
      this.toUpdateInput(dto),
    )) as DriverRecord;
    await this.timeline(id, principal, "UPDATED", "Cadastro do motorista atualizado", undefined, {
      fields: Object.keys(dto),
    });
    await this.audit.record({
      action: "UPDATE",
      tableName: "Driver",
      recordId: id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: this.auditValue(current),
      newValue: this.auditValue(driver),
      device,
    });
    await this.publish("DriverUpdated", driver, { fields: Object.keys(dto) });
    return driver;
  }

  async changeStatus(
    principal: RequestPrincipal,
    id: string,
    dto: ChangeDriverStatusDto,
    device?: RequestDevice,
  ) {
    const current = await this.requireDriver(principal, id);
    const driver = (await this.repository.update(principal.companyId, id, {
      status: dto.status,
      terminationDate: dto.status === "TERMINATED" ? new Date() : undefined,
    })) as DriverRecord;
    await this.timeline(
      id,
      principal,
      "STATUS_CHANGED",
      "Status do motorista alterado",
      dto.reason,
      {
        previousStatus: current.status,
        nextStatus: dto.status,
      },
    );
    await this.audit.record({
      action: "UPDATE",
      tableName: "Driver",
      recordId: id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { status: current.status },
      newValue: { status: dto.status, reason: dto.reason },
      device,
    });
    await this.publish("DriverStatusChanged", driver, {
      previousStatus: current.status,
      nextStatus: dto.status,
      reason: dto.reason,
    });
    return driver;
  }

  async assignVehicle(
    principal: RequestPrincipal,
    id: string,
    dto: AssignVehicleDto,
    device?: RequestDevice,
  ) {
    const driver = await this.requireDriver(principal, id);
    if (driver.status !== "ACTIVE")
      throw new BadRequestException("Only active drivers can receive vehicles");
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId: principal.companyId, archivedAt: null },
      select: { id: true, plate: true },
    });
    if (!vehicle) throw new BadRequestException("Invalid vehicle for company scope");
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const assignment = await this.prisma.$transaction(async (transaction) => {
      await transaction.driverVehicleAssignment.updateMany({
        where: {
          companyId: principal.companyId,
          endsAt: null,
          OR: [
            { driverId: id, isPrimary: true },
            { vehicleId: vehicle.id, isPrimary: true },
          ],
        },
        data: { endsAt: startsAt },
      });
      return transaction.driverVehicleAssignment.create({
        data: {
          companyId: principal.companyId,
          driverId: id,
          vehicleId: vehicle.id,
          startsAt,
          isPrimary: dto.isPrimary ?? true,
          notes: dto.notes,
          assignedById: principal.userId,
        },
        include: { vehicle: { select: { id: true, plate: true, status: true } } },
      });
    });
    await this.timeline(
      id,
      principal,
      "VEHICLE_ASSIGNED",
      `Veiculo ${vehicle.plate} atribuido`,
      dto.notes,
      { vehicleId: vehicle.id, assignmentId: assignment.id },
    );
    await this.audit.record({
      action: "CREATE",
      tableName: "DriverVehicleAssignment",
      recordId: assignment.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: { driverId: id, vehicleId: vehicle.id, startsAt: startsAt.toISOString() },
      device,
    });
    await this.publish("DriverVehicleAssigned", driver, {
      vehicleId: vehicle.id,
      assignmentId: assignment.id,
    });
    await this.notifications.create({
      companyId: principal.companyId,
      userId: principal.userId,
      channel: "INTERNAL",
      category: "drivers.assignment",
      title: "Veiculo atribuido ao motorista",
      body: `${vehicle.plate} foi atribuido a ${driver.name}.`,
      metadata: { driverId: id, vehicleId: vehicle.id },
    });
    return assignment;
  }

  async unassignVehicle(
    principal: RequestPrincipal,
    id: string,
    assignmentId: string,
    dto: UnassignVehicleDto,
    device?: RequestDevice,
  ) {
    const driver = await this.requireDriver(principal, id);
    const assignment = await this.prisma.driverVehicleAssignment.findFirst({
      where: { id: assignmentId, driverId: id, companyId: principal.companyId, endsAt: null },
      include: { vehicle: { select: { plate: true } } },
    });
    if (!assignment) throw new NotFoundException("Active assignment not found");
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : new Date();
    const result = await this.prisma.driverVehicleAssignment.update({
      where: { id: assignment.id, companyId: principal.companyId },
      data: { endsAt },
    });
    await this.timeline(
      id,
      principal,
      "VEHICLE_UNASSIGNED",
      `Veiculo ${assignment.vehicle.plate} desvinculado`,
      dto.reason,
      { vehicleId: assignment.vehicleId, assignmentId },
    );
    await this.audit.record({
      action: "UPDATE",
      tableName: "DriverVehicleAssignment",
      recordId: assignment.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { endsAt: null },
      newValue: { endsAt: endsAt.toISOString(), reason: dto.reason },
      device,
    });
    await this.publish("DriverVehicleUnassigned", driver, {
      vehicleId: assignment.vehicleId,
      assignmentId,
    });
    return result;
  }

  async addDocument(
    principal: RequestPrincipal,
    id: string,
    dto: CreateDriverDocumentDto,
    device?: RequestDevice,
  ) {
    const driver = await this.requireDriver(principal, id);
    const document = await this.prisma.driverDocument.create({
      data: {
        companyId: principal.companyId,
        driverId: id,
        type: dto.type,
        storageKey: dto.storageKey,
        url: dto.url,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeInBytes: dto.sizeInBytes,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        alertDaysBefore: dto.alertDaysBefore ?? 30,
        notes: dto.notes,
        uploadedById: principal.userId,
      },
    });
    await this.timeline(
      id,
      principal,
      "DOCUMENT_UPLOADED",
      "Documento do motorista anexado",
      undefined,
      { documentId: document.id, type: dto.type },
    );
    await this.audit.record({
      action: "CREATE",
      tableName: "DriverDocument",
      recordId: document.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: { driverId: id, type: dto.type, fileName: dto.fileName },
      device,
    });
    await this.publish("DriverDocumentUploaded", driver, {
      documentId: document.id,
      type: dto.type,
      expiresAt: dto.expiresAt,
    });
    if (dto.expiresAt)
      await this.scheduleDocumentAlert(
        principal,
        driver,
        dto.type,
        dto.expiresAt,
        dto.alertDaysBefore ?? 30,
      );
    return document;
  }

  async archive(
    principal: RequestPrincipal,
    id: string,
    dto: ArchiveDriverDto,
    device?: RequestDevice,
  ) {
    const current = await this.requireDriver(principal, id);
    const archivedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.driverVehicleAssignment.updateMany({
        where: { driverId: id, companyId: principal.companyId, endsAt: null },
        data: { endsAt: archivedAt },
      }),
      this.prisma.driver.update({
        where: { id, companyId: principal.companyId },
        data: { archivedAt, status: "INACTIVE" },
      }),
    ]);
    await this.timeline(id, principal, "ARCHIVED", "Motorista arquivado", dto.reason);
    await this.audit.record({
      action: "UPDATE",
      tableName: "Driver",
      recordId: id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { archivedAt: current.archivedAt, status: current.status },
      newValue: { archivedAt: archivedAt.toISOString(), status: "INACTIVE", reason: dto.reason },
      device,
    });
    await this.publish("DriverArchived", current, {
      archivedAt: archivedAt.toISOString(),
      reason: dto.reason,
    });
    return { archived: true };
  }

  private async requireDriver(principal: RequestPrincipal, id: string) {
    const driver = (await this.repository.findById(principal.companyId, id)) as DriverRecord | null;
    if (
      !driver ||
      (principal.branchId && driver.branchId && driver.branchId !== principal.branchId) ||
      (principal.departmentId &&
        driver.departmentId &&
        driver.departmentId !== principal.departmentId)
    ) {
      throw new NotFoundException("Driver not found");
    }
    return driver;
  }

  private async validateReferences(
    companyId: string,
    branchId?: string,
    departmentId?: string,
    userId?: string,
  ) {
    const [branch, department, user] = await Promise.all([
      branchId ? this.prisma.branch.count({ where: { id: branchId, companyId } }) : 1,
      departmentId
        ? this.prisma.department.count({
            where: {
              id: departmentId,
              companyId,
              ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : undefined),
            },
          })
        : 1,
      userId ? this.prisma.membership.count({ where: { userId, companyId, status: "ACTIVE" } }) : 1,
    ]);
    if (!branch || !department || !user)
      throw new BadRequestException("Invalid driver reference for company scope");
  }

  private toCreateInput(companyId: string, dto: CreateDriverDto): Prisma.DriverCreateInput {
    return {
      company: { connect: { id: companyId } },
      branch: dto.branchId ? { connect: { id: dto.branchId } } : undefined,
      department: dto.departmentId ? { connect: { id: dto.departmentId } } : undefined,
      user: dto.userId ? { connect: { id: dto.userId } } : undefined,
      name: dto.name.trim(),
      cpf: dto.cpf.replace(/\D/g, ""),
      cnhNumber: dto.cnhNumber.trim(),
      cnhCategory: dto.cnhCategory.toUpperCase().trim(),
      cnhExpiresAt: new Date(dto.cnhExpiresAt),
      cnhIssuedAt: dto.cnhIssuedAt ? new Date(dto.cnhIssuedAt) : undefined,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
      phone: dto.phone,
      email: dto.email?.toLowerCase().trim(),
      status: dto.status,
      medicalExamExpiresAt: dto.medicalExamExpiresAt
        ? new Date(dto.medicalExamExpiresAt)
        : undefined,
      toxicologyExamExpiresAt: dto.toxicologyExamExpiresAt
        ? new Date(dto.toxicologyExamExpiresAt)
        : undefined,
      notes: dto.notes,
    };
  }

  private toUpdateInput(dto: UpdateDriverDto): Prisma.DriverUpdateInput {
    return { ...this.toCreateInput("ignored", dto), company: undefined };
  }

  private scope(principal: RequestPrincipal): Prisma.DriverWhereInput {
    return {
      companyId: principal.companyId,
      branchId: principal.branchId,
      departmentId: principal.departmentId,
    };
  }

  private timeline(
    driverId: string,
    principal: RequestPrincipal,
    type: Prisma.DriverTimelineEventCreateInput["type"],
    title: string,
    description?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.driverTimelineEvent.create({
      data: {
        companyId: principal.companyId,
        driverId,
        actorId: principal.userId,
        type,
        title,
        description,
        metadata,
      },
    });
  }

  private publish(name: string, driver: DriverRecord, payload: Prisma.InputJsonValue) {
    return this.events.publish({
      name,
      aggregateType: "Driver",
      aggregateId: driver.id,
      companyId: driver.companyId,
      payload,
    });
  }

  private async notifyExpiry(principal: RequestPrincipal, driver: DriverRecord) {
    const alert = new Date(driver.cnhExpiresAt);
    alert.setDate(alert.getDate() - 30);
    await this.notifications.create({
      companyId: principal.companyId,
      userId: principal.userId,
      channel: "INTERNAL",
      category: "drivers.cnh",
      title: "CNH de motorista vencendo",
      body: `A CNH de ${driver.name} vence em ${driver.cnhExpiresAt.toISOString().slice(0, 10)}.`,
      priority: driver.cnhExpiresAt < new Date() ? "HIGH" : "NORMAL",
      scheduledAt: alert > new Date() ? alert : undefined,
      metadata: { driverId: driver.id, expiresAt: driver.cnhExpiresAt.toISOString() },
    });
  }

  private async scheduleDocumentAlert(
    principal: RequestPrincipal,
    driver: DriverRecord,
    type: string,
    expiresAt: string,
    days: number,
  ) {
    const expiration = new Date(expiresAt);
    const alert = new Date(expiration);
    alert.setDate(alert.getDate() - days);
    await this.notifications.create({
      companyId: principal.companyId,
      userId: principal.userId,
      channel: "INTERNAL",
      category: "drivers.document",
      title: "Documento de motorista vencendo",
      body: `${type} de ${driver.name} vence em ${expiresAt.slice(0, 10)}.`,
      priority: expiration < new Date() ? "HIGH" : "NORMAL",
      scheduledAt: alert > new Date() ? alert : undefined,
      metadata: { driverId: driver.id, type, expiresAt },
    });
  }

  private auditValue(driver: DriverRecord) {
    return {
      id: driver.id,
      name: driver.name,
      cpf: driver.cpf,
      cnhNumber: driver.cnhNumber,
      status: driver.status,
      branchId: driver.branchId,
      departmentId: driver.departmentId,
    };
  }
}

type DriverRecord = Prisma.DriverGetPayload<{
  include: { branch: true; department: true; assignments: true; documents: true; timeline: true };
}>;
