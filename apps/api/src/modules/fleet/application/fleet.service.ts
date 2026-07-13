import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, VehicleDocumentType, VehicleTimelineType } from "@fleetcontrol/database";

import type { RequestDevice, RequestPrincipal } from "../../../common/context/request-context";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { AuditService } from "../../audit/application/audit.service";
import { EventBusService } from "../../events/application/event-bus.service";
import { NotificationsService } from "../../notifications/application/notifications.service";
import {
  fleetEvents,
  vehicleCostTypes,
  vehicleDocumentTypes,
  vehicleFuelTypes,
  vehicleStatuses,
} from "../domain/fleet.constants";
import type { FleetRepository } from "./fleet.repository";
import { FLEET_REPOSITORY } from "./fleet.repository";
import type {
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
} from "../presentation/fleet.dto";

@Injectable()
export class FleetService {
  constructor(
    @Inject(FLEET_REPOSITORY) private readonly repository: FleetRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}

  async listVehicles(principal: RequestPrincipal, query: ListVehiclesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await this.repository.listVehicles({
      companyId: principal.companyId,
      branchId: query.branchId ?? principal.branchId,
      departmentId: query.departmentId ?? principal.departmentId,
      search: query.search,
      status: query.status,
      categoryId: query.categoryId,
      makeId: query.makeId,
      modelId: query.modelId,
      page,
      pageSize,
      orderBy: query.orderBy ?? "createdAt",
      orderDirection: query.orderDirection ?? "desc",
    });

    return {
      data: result.data.map((vehicle) => this.toVehicleListItem(vehicle as VehicleRecord)),
      pagination: {
        page,
        pageSize,
        total: result.total,
        pageCount: Math.ceil(result.total / pageSize),
      },
    };
  }

  async getDashboard(principal: RequestPrincipal) {
    const companyScope = this.vehicleScope(principal);
    const now = new Date();
    const nextThirtyDays = new Date(now);
    nextThirtyDays.setDate(now.getDate() + 30);

    const [
      active,
      available,
      stopped,
      maintenance,
      withoutContract,
      expiredDocuments,
      expiringDocuments,
      ageRows,
      valueRows,
    ] = await this.prisma.$transaction([
      this.prisma.vehicle.count({ where: { ...companyScope, archivedAt: null } }),
      this.prisma.vehicle.count({
        where: { ...companyScope, status: "AVAILABLE", archivedAt: null },
      }),
      this.prisma.vehicle.count({
        where: { ...companyScope, status: "STOPPED", archivedAt: null },
      }),
      this.prisma.vehicle.count({
        where: { ...companyScope, status: "IN_MAINTENANCE", archivedAt: null },
      }),
      this.prisma.vehicle.count({ where: { ...companyScope, contractId: null, archivedAt: null } }),
      this.prisma.vehicleDocument.count({
        where: { companyId: principal.companyId, expiresAt: { lt: now } },
      }),
      this.prisma.vehicleDocument.count({
        where: {
          companyId: principal.companyId,
          expiresAt: { gte: now, lte: nextThirtyDays },
        },
      }),
      this.prisma.vehicle.findMany({
        where: { ...companyScope, modelYear: { not: null }, archivedAt: null },
        select: { modelYear: true },
      }),
      this.prisma.vehicle.findMany({
        where: { ...companyScope, estimatedValue: { not: null }, archivedAt: null },
        select: { estimatedValue: true },
      }),
    ]);

    const currentYear = now.getFullYear();
    const averageAge =
      ageRows.length === 0
        ? 0
        : ageRows.reduce((sum, row) => sum + (currentYear - (row.modelYear ?? currentYear)), 0) /
          ageRows.length;
    const estimatedFleetValue = valueRows.reduce(
      (sum, row) => sum + Number(row.estimatedValue ?? 0),
      0,
    );

    return {
      active,
      available,
      stopped,
      maintenance,
      withoutDriver: 0,
      withoutContract,
      expiredDocuments,
      expiringDocuments,
      averageFleetAge: Number(averageAge.toFixed(1)),
      estimatedFleetValue,
    };
  }

  async getOptions(principal: RequestPrincipal) {
    const companyId = principal.companyId;
    const [branches, departments, costCenters, categories, subcategories, makes, models, versions] =
      await this.prisma.$transaction([
        this.prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
        this.prisma.department.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
        this.prisma.costCenter.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
        this.prisma.vehicleCategory.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
        this.prisma.vehicleSubcategory.findMany({
          where: { companyId },
          orderBy: { name: "asc" },
        }),
        this.prisma.vehicleMake.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
        this.prisma.vehicleModel.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
        this.prisma.vehicleVersion.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
      ]);

    return {
      statuses: this.toOptions(vehicleStatuses),
      fuelTypes: this.toOptions(vehicleFuelTypes),
      documentTypes: this.toOptions(vehicleDocumentTypes),
      costTypes: this.toOptions(vehicleCostTypes),
      branches,
      departments,
      costCenters,
      categories,
      subcategories,
      makes,
      models,
      versions,
    };
  }

  listSavedFilters(principal: RequestPrincipal) {
    return this.prisma.vehicleSavedFilter.findMany({
      where: {
        companyId: principal.companyId,
        userId: principal.userId,
        scope: "fleet.vehicles",
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  async createSavedFilter(
    principal: RequestPrincipal,
    dto: CreateVehicleSavedFilterDto,
    device?: RequestDevice,
  ) {
    const filter = await this.prisma.$transaction(async (transaction) => {
      if (dto.isDefault) {
        await transaction.vehicleSavedFilter.updateMany({
          where: {
            companyId: principal.companyId,
            userId: principal.userId,
            scope: "fleet.vehicles",
          },
          data: { isDefault: false },
        });
      }

      return transaction.vehicleSavedFilter.upsert({
        where: {
          companyId_userId_scope_name: {
            companyId: principal.companyId,
            userId: principal.userId,
            scope: "fleet.vehicles",
            name: dto.name.trim(),
          },
        },
        create: {
          companyId: principal.companyId,
          userId: principal.userId,
          scope: "fleet.vehicles",
          name: dto.name.trim(),
          filters: dto.filters,
          isDefault: dto.isDefault ?? false,
        },
        update: { filters: dto.filters, isDefault: dto.isDefault ?? false },
      });
    });

    await this.audit.record({
      action: "CREATE",
      tableName: "VehicleSavedFilter",
      recordId: filter.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: { name: filter.name, filters: dto.filters, isDefault: filter.isDefault },
      device,
    });

    return filter;
  }

  async deleteSavedFilter(principal: RequestPrincipal, filterId: string, device?: RequestDevice) {
    const filter = await this.prisma.vehicleSavedFilter.findFirst({
      where: {
        id: filterId,
        companyId: principal.companyId,
        userId: principal.userId,
        scope: "fleet.vehicles",
      },
    });

    if (!filter) {
      throw new NotFoundException("Saved filter not found");
    }

    await this.prisma.vehicleSavedFilter.delete({
      where: { id: filter.id, companyId: principal.companyId, userId: principal.userId },
    });
    await this.audit.record({
      action: "DELETE",
      tableName: "VehicleSavedFilter",
      recordId: filter.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { name: filter.name, filters: filter.filters, isDefault: filter.isDefault },
      device,
    });

    return { deleted: true };
  }

  async getVehicle(principal: RequestPrincipal, id: string) {
    const vehicle = await this.requireVehicle(principal, id);
    return this.toVehicleDetail(vehicle);
  }

  async createVehicle(principal: RequestPrincipal, dto: CreateVehicleDto, device?: RequestDevice) {
    await this.validateVehicleReferences(principal.companyId, dto);
    const vehicle = (await this.repository.createVehicle(
      this.buildVehicleCreateInput(principal.companyId, dto),
    )) as VehicleRecord;

    await this.recordTimeline(vehicle.id, principal.companyId, "CREATED", "Veiculo cadastrado", {
      actorId: principal.userId,
      metadata: { plate: vehicle.plate },
    });
    await this.audit.record({
      action: "CREATE",
      tableName: "Vehicle",
      recordId: vehicle.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: this.toAuditValue(vehicle),
      device,
    });
    await this.publishVehicleEvent(fleetEvents.created, vehicle, { plate: vehicle.plate });

    return this.toVehicleDetail(vehicle);
  }

  async updateVehicle(
    principal: RequestPrincipal,
    id: string,
    dto: UpdateVehicleDto,
    device?: RequestDevice,
  ) {
    const current = await this.requireVehicle(principal, id);
    await this.validateVehicleReferences(principal.companyId, dto);
    const vehicle = (await this.repository.updateVehicle(
      principal.companyId,
      current.id,
      this.buildVehicleUpdateInput(dto),
    )) as VehicleRecord;

    await this.recordTimeline(vehicle.id, principal.companyId, "UPDATED", "Dados atualizados", {
      actorId: principal.userId,
      metadata: { fields: Object.keys(dto) },
    });
    await this.audit.record({
      action: "UPDATE",
      tableName: "Vehicle",
      recordId: vehicle.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: this.toAuditValue(current),
      newValue: this.toAuditValue(vehicle),
      device,
    });
    await this.publishVehicleEvent(fleetEvents.updated, vehicle, { fields: Object.keys(dto) });

    return this.toVehicleDetail(vehicle);
  }

  async changeStatus(
    principal: RequestPrincipal,
    id: string,
    dto: ChangeVehicleStatusDto,
    device?: RequestDevice,
  ) {
    const current = await this.requireVehicle(principal, id);
    const vehicle = (await this.repository.updateVehicle(principal.companyId, current.id, {
      status: dto.status,
    })) as VehicleRecord;

    await this.recordTimeline(
      vehicle.id,
      principal.companyId,
      "STATUS_CHANGED",
      "Status alterado",
      {
        actorId: principal.userId,
        description: `${current.status} -> ${vehicle.status}`,
        metadata: { previousStatus: current.status, nextStatus: dto.status, reason: dto.reason },
      },
    );
    await this.audit.record({
      action: "UPDATE",
      tableName: "Vehicle",
      recordId: vehicle.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { status: current.status },
      newValue: { status: vehicle.status },
      device,
    });
    await this.publishVehicleEvent(fleetEvents.statusChanged, vehicle, {
      previousStatus: current.status,
      nextStatus: dto.status,
    });
    await this.notifications.create({
      companyId: principal.companyId,
      userId: principal.userId,
      channel: "INTERNAL",
      category: "fleet.status",
      title: "Status do veiculo alterado",
      body: `${vehicle.plate} agora esta como ${vehicle.status}.`,
      metadata: { vehicleId: vehicle.id, status: vehicle.status },
    });

    return this.toVehicleDetail(vehicle);
  }

  async transferVehicle(
    principal: RequestPrincipal,
    id: string,
    dto: TransferVehicleDto,
    device?: RequestDevice,
  ) {
    const current = await this.requireVehicle(principal, id);
    await this.validateVehicleReferences(principal.companyId, dto);
    const vehicle = (await this.repository.updateVehicle(
      principal.companyId,
      current.id,
      this.buildTransferInput(dto),
    )) as VehicleRecord;

    await this.recordTimeline(
      vehicle.id,
      principal.companyId,
      "TRANSFERRED",
      "Veiculo transferido",
      {
        actorId: principal.userId,
        metadata: {
          previousBranchId: current.branchId,
          nextBranchId: vehicle.branchId,
          previousDepartmentId: current.departmentId,
          nextDepartmentId: vehicle.departmentId,
          reason: dto.reason,
        },
      },
    );
    await this.audit.record({
      action: "UPDATE",
      tableName: "Vehicle",
      recordId: vehicle.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: {
        branchId: current.branchId,
        departmentId: current.departmentId,
        costCenterId: current.costCenterId,
      },
      newValue: {
        branchId: vehicle.branchId,
        departmentId: vehicle.departmentId,
        costCenterId: vehicle.costCenterId,
      },
      device,
    });
    await this.publishVehicleEvent(fleetEvents.transferred, vehicle, {
      branchId: vehicle.branchId,
      departmentId: vehicle.departmentId,
    });

    return this.toVehicleDetail(vehicle);
  }

  async archiveVehicle(
    principal: RequestPrincipal,
    id: string,
    dto: ArchiveVehicleDto,
    device?: RequestDevice,
  ) {
    const current = await this.requireVehicle(principal, id);
    const archivedAt = new Date();
    const vehicle = (await this.repository.updateVehicle(principal.companyId, current.id, {
      archivedAt,
      status: "INACTIVE",
    })) as VehicleRecord;

    await this.recordTimeline(vehicle.id, principal.companyId, "ARCHIVED", "Veiculo arquivado", {
      actorId: principal.userId,
      description: dto.reason,
      metadata: { reason: dto.reason, previousStatus: current.status, archivedAt },
    });
    await this.audit.record({
      action: "UPDATE",
      tableName: "Vehicle",
      recordId: vehicle.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { archivedAt: current.archivedAt, status: current.status },
      newValue: { archivedAt, status: vehicle.status, reason: dto.reason },
      device,
    });
    await this.publishVehicleEvent(fleetEvents.archived, vehicle, {
      reason: dto.reason,
      previousStatus: current.status,
      archivedAt,
    });
    await this.notifications.create({
      companyId: principal.companyId,
      userId: principal.userId,
      channel: "INTERNAL",
      category: "fleet.lifecycle",
      title: "Veiculo arquivado",
      body: `${vehicle.plate} foi removido da frota ativa.`,
      metadata: { vehicleId: vehicle.id, reason: dto.reason },
    });

    return this.toVehicleDetail(vehicle);
  }

  async addPhoto(
    principal: RequestPrincipal,
    id: string,
    dto: CreateVehiclePhotoDto,
    device?: RequestDevice,
  ) {
    const vehicle = await this.requireVehicle(principal, id);

    if (dto.isPrimary) {
      await this.prisma.vehiclePhoto.updateMany({
        where: { vehicleId: vehicle.id, companyId: principal.companyId },
        data: { isPrimary: false },
      });
    }

    const photo = await this.repository.addPhoto({
      vehicle: { connect: { id: vehicle.id } },
      company: { connect: { id: principal.companyId } },
      uploadedBy: { connect: { id: principal.userId } },
      storageKey: dto.storageKey,
      url: dto.url,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeInBytes: dto.sizeInBytes,
      isPrimary: dto.isPrimary ?? false,
    });

    await this.recordTimeline(vehicle.id, principal.companyId, "PHOTO_ADDED", "Foto adicionada", {
      actorId: principal.userId,
      metadata: { fileName: dto.fileName, isPrimary: dto.isPrimary ?? false },
    });
    await this.audit.record({
      action: "CREATE",
      tableName: "VehiclePhoto",
      recordId: (photo as { id: string }).id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: { vehicleId: vehicle.id, fileName: dto.fileName, url: dto.url },
      device,
    });
    await this.publishVehicleEvent(fleetEvents.photoAdded, vehicle, { fileName: dto.fileName });

    return photo;
  }

  async addDocument(
    principal: RequestPrincipal,
    id: string,
    dto: CreateVehicleDocumentDto,
    device?: RequestDevice,
  ) {
    const vehicle = await this.requireVehicle(principal, id);
    const document = await this.repository.addDocument({
      vehicle: { connect: { id: vehicle.id } },
      company: { connect: { id: principal.companyId } },
      responsibleUser: dto.responsibleUserId
        ? { connect: { id: dto.responsibleUserId } }
        : undefined,
      type: dto.type,
      storageKey: dto.storageKey,
      url: dto.url,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeInBytes: dto.sizeInBytes,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      responsibleName: dto.responsibleName,
      notes: dto.notes,
      alertDaysBefore: dto.alertDaysBefore ?? 30,
    });

    await this.recordTimeline(
      vehicle.id,
      principal.companyId,
      "DOCUMENT_UPLOADED",
      "Documento anexado",
      {
        actorId: principal.userId,
        metadata: { type: dto.type, fileName: dto.fileName, expiresAt: dto.expiresAt },
      },
    );
    await this.audit.record({
      action: "CREATE",
      tableName: "VehicleDocument",
      recordId: (document as { id: string }).id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: { vehicleId: vehicle.id, type: dto.type, fileName: dto.fileName },
      device,
    });
    await this.publishVehicleEvent(fleetEvents.documentUploaded, vehicle, {
      type: dto.type,
      expiresAt: dto.expiresAt,
    });
    await this.scheduleDocumentNotification(principal, vehicle, dto.type, dto.expiresAt);

    return document;
  }

  async listVehicleDocuments(principal: RequestPrincipal, id: string) {
    const vehicle = await this.requireVehicle(principal, id);
    return this.prisma.vehicleDocument.findMany({
      where: { vehicleId: vehicle.id, companyId: principal.companyId },
      orderBy: [{ expiresAt: "asc" }, { uploadedAt: "desc" }],
    });
  }

  async listVehiclePhotos(principal: RequestPrincipal, id: string) {
    const vehicle = await this.requireVehicle(principal, id);
    return this.prisma.vehiclePhoto.findMany({
      where: { vehicleId: vehicle.id, companyId: principal.companyId },
      orderBy: [{ isPrimary: "desc" }, { uploadedAt: "desc" }],
    });
  }

  async listTimeline(principal: RequestPrincipal, id: string) {
    const vehicle = await this.requireVehicle(principal, id);
    return this.prisma.vehicleTimelineEvent.findMany({
      where: { vehicleId: vehicle.id, companyId: principal.companyId },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getCosts(principal: RequestPrincipal, id: string) {
    const vehicle = await this.requireVehicle(principal, id);
    const costs = await this.prisma.vehicleCostAggregate.findMany({
      where: { vehicleId: vehicle.id, companyId: principal.companyId },
      orderBy: { month: "desc" },
      take: 60,
    });
    const total = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
    const distance = costs.reduce((sum, cost) => sum + Number(cost.distance ?? 0), 0);
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    return {
      total,
      monthly: costs
        .filter((cost) => cost.month >= currentMonth)
        .reduce((sum, cost) => sum + Number(cost.amount), 0),
      costPerKm: distance > 0 ? total / distance : 0,
      byType: costs,
    };
  }

  async getAudit(principal: RequestPrincipal, id: string) {
    const vehicle = await this.requireVehicle(principal, id);
    return this.prisma.auditLog.findMany({
      where: {
        companyId: principal.companyId,
        tableName: { in: ["Vehicle", "VehiclePhoto", "VehicleDocument"] },
        recordId: vehicle.id,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getEvents(principal: RequestPrincipal, id: string) {
    const vehicle = await this.requireVehicle(principal, id);
    return this.prisma.outboxEvent.findMany({
      where: { companyId: principal.companyId, aggregateType: "Vehicle", aggregateId: vehicle.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getRelationships(principal: RequestPrincipal, id: string) {
    const vehicle = await this.requireVehicle(principal, id);
    return {
      vehicleId: vehicle.id,
      prepared: {
        tires: true,
        fuelings: true,
        drivers: true,
        fines: true,
        maintenances: true,
        contracts: true,
      },
      current: {
        branch: vehicle.branch,
        department: vehicle.department,
        costCenter: vehicle.costCenter,
        contractId: vehicle.contractId,
      },
    };
  }

  async createCatalog(
    principal: RequestPrincipal,
    type: "categories" | "subcategories" | "makes" | "models" | "versions" | "cost-centers",
    dto: CreateFleetCatalogDto,
  ) {
    const company = { connect: { id: principal.companyId } };

    if (type === "categories") {
      return this.prisma.vehicleCategory.create({
        data: { company, name: dto.name, code: dto.code },
      });
    }

    if (type === "subcategories") {
      return this.prisma.vehicleSubcategory.create({
        data: {
          company,
          category: { connect: { id: dto.categoryId } },
          name: dto.name,
          code: dto.code,
        },
      });
    }

    if (type === "makes") {
      return this.prisma.vehicleMake.create({ data: { company, name: dto.name } });
    }

    if (type === "models") {
      return this.prisma.vehicleModel.create({
        data: { company, make: { connect: { id: dto.makeId } }, name: dto.name },
      });
    }

    if (type === "versions") {
      return this.prisma.vehicleVersion.create({
        data: { company, model: { connect: { id: dto.modelId } }, name: dto.name },
      });
    }

    return this.prisma.costCenter.create({
      data: {
        company,
        branch: dto.branchId ? { connect: { id: dto.branchId } } : undefined,
        name: dto.name,
        code: dto.code,
      },
    });
  }

  private async requireVehicle(principal: RequestPrincipal, id: string) {
    const vehicle = (await this.repository.findVehicleById(
      principal.companyId,
      id,
    )) as VehicleRecord | null;

    if (!vehicle) {
      throw new NotFoundException("Vehicle not found");
    }

    if (principal.branchId && vehicle.branchId && vehicle.branchId !== principal.branchId) {
      throw new NotFoundException("Vehicle not found");
    }

    if (
      principal.departmentId &&
      vehicle.departmentId &&
      vehicle.departmentId !== principal.departmentId
    ) {
      throw new NotFoundException("Vehicle not found");
    }

    return vehicle;
  }

  private async validateVehicleReferences(
    companyId: string,
    dto: Partial<CreateVehicleDto & TransferVehicleDto>,
  ) {
    await Promise.all([
      this.ensureReference("branch", dto.branchId, () =>
        this.prisma.branch.count({ where: { id: dto.branchId, companyId } }),
      ),
      this.ensureReference("department", dto.departmentId, () =>
        this.prisma.department.count({
          where: {
            id: dto.departmentId,
            companyId,
            ...(dto.branchId
              ? { OR: [{ branchId: dto.branchId }, { branchId: null }] }
              : undefined),
          },
        }),
      ),
      this.ensureReference("cost center", dto.costCenterId, () =>
        this.prisma.costCenter.count({
          where: {
            id: dto.costCenterId,
            companyId,
            ...(dto.branchId
              ? { OR: [{ branchId: dto.branchId }, { branchId: null }] }
              : undefined),
          },
        }),
      ),
      this.ensureReference("category", dto.categoryId, () =>
        this.prisma.vehicleCategory.count({ where: { id: dto.categoryId, companyId } }),
      ),
      this.ensureReference("subcategory", dto.subcategoryId, () =>
        this.prisma.vehicleSubcategory.count({ where: { id: dto.subcategoryId, companyId } }),
      ),
      this.ensureReference("make", dto.makeId, () =>
        this.prisma.vehicleMake.count({ where: { id: dto.makeId, companyId } }),
      ),
      this.ensureReference("model", dto.modelId, () =>
        this.prisma.vehicleModel.count({ where: { id: dto.modelId, companyId } }),
      ),
      this.ensureReference("version", dto.versionId, () =>
        this.prisma.vehicleVersion.count({ where: { id: dto.versionId, companyId } }),
      ),
    ]);
  }

  private async ensureReference(
    label: string,
    id: string | undefined,
    count: () => Promise<number>,
  ) {
    if (id && (await count()) === 0) {
      throw new BadRequestException(`Invalid ${label} for company scope`);
    }
  }

  private buildVehicleCreateInput(
    companyId: string,
    dto: CreateVehicleDto,
  ): Prisma.VehicleCreateInput {
    return {
      company: { connect: { id: companyId } },
      branch: dto.branchId ? { connect: { id: dto.branchId } } : undefined,
      department: dto.departmentId ? { connect: { id: dto.departmentId } } : undefined,
      costCenter: dto.costCenterId ? { connect: { id: dto.costCenterId } } : undefined,
      category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
      subcategory: dto.subcategoryId ? { connect: { id: dto.subcategoryId } } : undefined,
      make: dto.makeId ? { connect: { id: dto.makeId } } : undefined,
      model: dto.modelId ? { connect: { id: dto.modelId } } : undefined,
      version: dto.versionId ? { connect: { id: dto.versionId } } : undefined,
      plate: dto.plate.toUpperCase().trim(),
      renavam: dto.renavam,
      chassis: dto.chassis,
      engineNumber: dto.engineNumber,
      power: dto.power,
      fuelType: dto.fuelType,
      capacity: dto.capacity,
      grossWeight: dto.grossWeight,
      netWeight: dto.netWeight,
      axleCount: dto.axleCount,
      vehicleType: dto.vehicleType,
      operationalCategory: dto.operationalCategory,
      manufactureYear: dto.manufactureYear,
      modelYear: dto.modelYear,
      color: dto.color,
      status: dto.status ?? "AVAILABLE",
      estimatedValue: dto.estimatedValue,
      currentOdometer: dto.currentOdometer,
      contractId: dto.contractId,
      observations: dto.observations,
    };
  }

  private buildVehicleUpdateInput(dto: UpdateVehicleDto): Prisma.VehicleUpdateInput {
    return {
      ...this.buildVehicleCreateInput("__ignored__", { ...dto, plate: dto.plate ?? "" }),
      company: undefined,
      plate: dto.plate ? dto.plate.toUpperCase().trim() : undefined,
    };
  }

  private buildTransferInput(dto: TransferVehicleDto): Prisma.VehicleUpdateInput {
    return {
      branch: dto.branchId ? { connect: { id: dto.branchId } } : { disconnect: true },
      department: dto.departmentId ? { connect: { id: dto.departmentId } } : { disconnect: true },
      costCenter: dto.costCenterId ? { connect: { id: dto.costCenterId } } : { disconnect: true },
    };
  }

  private vehicleScope(principal: RequestPrincipal): Prisma.VehicleWhereInput {
    return {
      companyId: principal.companyId,
      branchId: principal.branchId,
      departmentId: principal.departmentId,
    };
  }

  private async recordTimeline(
    vehicleId: string,
    companyId: string,
    type: VehicleTimelineType,
    title: string,
    input: { actorId?: string; description?: string; metadata?: Prisma.InputJsonValue },
  ) {
    await this.repository.createTimelineEvent({
      vehicle: { connect: { id: vehicleId } },
      company: { connect: { id: companyId } },
      actor: input.actorId ? { connect: { id: input.actorId } } : undefined,
      type,
      title,
      description: input.description,
      metadata: input.metadata,
    });
  }

  private publishVehicleEvent(
    name: string,
    vehicle: VehicleRecord,
    payload: Prisma.InputJsonValue,
  ) {
    return this.events.publish({
      name,
      aggregateType: "Vehicle",
      aggregateId: vehicle.id,
      companyId: vehicle.companyId,
      payload,
    });
  }

  private async scheduleDocumentNotification(
    principal: RequestPrincipal,
    vehicle: VehicleRecord,
    type: VehicleDocumentType,
    expiresAt?: string,
  ) {
    if (!expiresAt) {
      return;
    }

    const expiration = new Date(expiresAt);
    const now = new Date();
    const alertDate = new Date(expiration);
    alertDate.setDate(expiration.getDate() - 30);

    await this.notifications.create({
      companyId: principal.companyId,
      userId: principal.userId,
      channel: "INTERNAL",
      category: "fleet.document",
      title: "Documento de veiculo vencendo",
      body: `${type} do veiculo ${vehicle.plate} vence em ${expiration.toISOString().slice(0, 10)}.`,
      priority: expiration < now ? "HIGH" : "NORMAL",
      scheduledAt: alertDate > now ? alertDate : undefined,
      metadata: { vehicleId: vehicle.id, documentType: type, expiresAt },
    });
  }

  private toOptions(values: Record<string, string>) {
    return Object.entries(values).map(([value, label]) => ({ value, label }));
  }

  private toVehicleListItem(vehicle: VehicleRecord) {
    return {
      ...this.toVehicleDetail(vehicle),
      timeline: undefined,
      costs: undefined,
    };
  }

  private toVehicleDetail(vehicle: VehicleRecord) {
    return {
      ...vehicle,
      grossWeight: this.toNumber(vehicle.grossWeight),
      netWeight: this.toNumber(vehicle.netWeight),
      estimatedValue: this.toNumber(vehicle.estimatedValue),
      currentOdometer: this.toNumber(vehicle.currentOdometer),
      costs: vehicle.costs?.map((cost) => ({
        ...cost,
        amount: this.toNumber(cost.amount),
        distance: this.toNumber(cost.distance),
      })),
    };
  }

  private toAuditValue(vehicle: VehicleRecord) {
    return {
      id: vehicle.id,
      plate: vehicle.plate,
      status: vehicle.status,
      branchId: vehicle.branchId,
      departmentId: vehicle.departmentId,
      costCenterId: vehicle.costCenterId,
    };
  }

  private toNumber(value: unknown) {
    return value === null || value === undefined ? null : Number(value);
  }
}

type VehicleRecord = Prisma.VehicleGetPayload<{
  include: {
    branch: true;
    department: true;
    costCenter: true;
    category: true;
    subcategory: true;
    make: true;
    model: true;
    version: true;
    photos: true;
    documents: true;
    timeline: true;
    costs: true;
  };
}>;
