import type { ContractStatus, Prisma } from "@fleetcontrol/database";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { RequestDevice, RequestPrincipal } from "../../../common/context/request-context";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { AuditService } from "../../audit/application/audit.service";
import { EventBusService } from "../../events/application/event-bus.service";
import { NotificationsService } from "../../notifications/application/notifications.service";
import type {
  AllocateContractVehicleDto,
  ArchiveContractDto,
  ChangeContractStatusDto,
  CreateContractAmendmentDto,
  CreateContractDocumentDto,
  CreateContractDto,
  ListContractsQueryDto,
  ReleaseContractVehicleDto,
  UpdateContractDto,
} from "../presentation/contracts.dto";
import { CONTRACTS_REPOSITORY, type ContractsRepository } from "./contracts.repository";

const statusLabels: Record<ContractStatus, string> = {
  DRAFT: "Rascunho",
  BIDDING: "Em licitacao",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  EXPIRED: "Vencido",
  TERMINATED: "Encerrado",
  CANCELLED: "Cancelado",
};

@Injectable()
export class ContractsService {
  constructor(
    @Inject(CONTRACTS_REPOSITORY) private readonly repository: ContractsRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(principal: RequestPrincipal, query: ListContractsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const result = await this.repository.list({
      companyId: principal.companyId,
      branchId: query.branchId ?? principal.branchId,
      search: query.search,
      status: query.status,
      type: query.type,
      page,
      pageSize,
    });
    return {
      data: result.data.map((item) => this.toResponse(item as ContractRecord)),
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
    const inNinetyDays = new Date(now);
    inNinetyDays.setDate(now.getDate() + 90);
    const where = {
      companyId: principal.companyId,
      branchId: principal.branchId,
      archivedAt: null,
    };
    const [active, bidding, expiring, expired, values, allocations] =
      await this.prisma.$transaction([
        this.prisma.contract.count({ where: { ...where, status: "ACTIVE" } }),
        this.prisma.contract.count({ where: { ...where, status: "BIDDING" } }),
        this.prisma.contract.count({
          where: { ...where, endsAt: { gte: now, lte: inNinetyDays }, status: "ACTIVE" },
        }),
        this.prisma.contract.count({
          where: { ...where, endsAt: { lt: now }, status: { notIn: ["TERMINATED", "CANCELLED"] } },
        }),
        this.prisma.contract.aggregate({ where, _sum: { totalValue: true, consumedValue: true } }),
        this.prisma.contractVehicleAllocation.count({
          where: { companyId: principal.companyId, endsAt: null },
        }),
      ]);
    const totalValue = Number(values._sum.totalValue ?? 0);
    const consumedValue = Number(values._sum.consumedValue ?? 0);
    return {
      active,
      bidding,
      expiring,
      expired,
      allocatedVehicles: allocations,
      totalValue,
      consumedValue,
      availableValue: totalValue - consumedValue,
      utilizationPercent: totalValue > 0 ? (consumedValue / totalValue) * 100 : 0,
    };
  }

  async options(principal: RequestPrincipal) {
    const [branches, managers, vehicles] = await this.prisma.$transaction([
      this.prisma.branch.findMany({
        where: { companyId: principal.companyId },
        orderBy: { name: "asc" },
      }),
      this.prisma.membership.findMany({
        where: { companyId: principal.companyId, status: "ACTIVE" },
        select: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      }),
      this.prisma.vehicle.findMany({
        where: { companyId: principal.companyId, archivedAt: null },
        select: { id: true, plate: true, status: true, contractId: true },
        orderBy: { plate: "asc" },
      }),
    ]);
    return {
      statuses: Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
      types: [
        { value: "PUBLIC_BID", label: "Licitacao publica" },
        { value: "DIRECT_AWARD", label: "Contratacao direta" },
        { value: "FRAMEWORK", label: "Ata/registro de precos" },
        { value: "PRIVATE", label: "Privado" },
      ],
      branches,
      managers: managers.map((item) => item.user),
      vehicles,
    };
  }

  async get(principal: RequestPrincipal, id: string) {
    return this.toResponse(await this.requireContract(principal, id));
  }

  async create(principal: RequestPrincipal, dto: CreateContractDto, device?: RequestDevice) {
    this.validateDates(dto.startsAt, dto.endsAt);
    await this.validateReferences(principal.companyId, dto.branchId, dto.managerUserId);
    const contract = (await this.repository.create(
      this.createInput(principal.companyId, dto),
    )) as ContractRecord;
    await this.timeline(contract.id, principal, "CREATED", "Contrato cadastrado");
    await this.audit.record({
      action: "CREATE",
      tableName: "Contract",
      recordId: contract.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: this.auditValue(contract),
      device,
    });
    await this.publish("ContractCreated", contract, {
      number: contract.number,
      endsAt: contract.endsAt.toISOString(),
    });
    await this.scheduleRenewal(principal, contract);
    return this.toResponse(contract);
  }

  async update(
    principal: RequestPrincipal,
    id: string,
    dto: UpdateContractDto,
    device?: RequestDevice,
  ) {
    const current = await this.requireContract(principal, id);
    this.validateDates(dto.startsAt, dto.endsAt);
    await this.validateReferences(principal.companyId, dto.branchId, dto.managerUserId);
    const contract = (await this.repository.update(
      principal.companyId,
      id,
      this.updateInput(dto),
    )) as ContractRecord;
    await this.timeline(id, principal, "UPDATED", "Contrato atualizado", undefined, {
      fields: Object.keys(dto),
    });
    await this.audit.record({
      action: "UPDATE",
      tableName: "Contract",
      recordId: id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: this.auditValue(current),
      newValue: this.auditValue(contract),
      device,
    });
    await this.publish("ContractUpdated", contract, { fields: Object.keys(dto) });
    return this.toResponse(contract);
  }

  async changeStatus(
    principal: RequestPrincipal,
    id: string,
    dto: ChangeContractStatusDto,
    device?: RequestDevice,
  ) {
    const current = await this.requireContract(principal, id);
    const contract = (await this.repository.update(principal.companyId, id, {
      status: dto.status,
    })) as ContractRecord;
    await this.timeline(id, principal, "STATUS_CHANGED", "Status contratual alterado", dto.reason, {
      previousStatus: current.status,
      nextStatus: dto.status,
    });
    await this.audit.record({
      action: "UPDATE",
      tableName: "Contract",
      recordId: id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { status: current.status },
      newValue: { status: dto.status, reason: dto.reason },
      device,
    });
    await this.publish("ContractStatusChanged", contract, {
      previousStatus: current.status,
      nextStatus: dto.status,
      reason: dto.reason,
    });
    return this.toResponse(contract);
  }

  async addAmendment(
    principal: RequestPrincipal,
    id: string,
    dto: CreateContractAmendmentDto,
    device?: RequestDevice,
  ) {
    const contract = await this.requireContract(principal, id);
    const valueChange = dto.valueChange ?? 0;
    const amendment = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.contractAmendment.create({
        data: {
          companyId: principal.companyId,
          contractId: id,
          number: dto.number.trim(),
          description: dto.description,
          effectiveAt: new Date(dto.effectiveAt),
          signedAt: dto.signedAt ? new Date(dto.signedAt) : undefined,
          previousEndAt: dto.newEndAt ? contract.endsAt : undefined,
          newEndAt: dto.newEndAt ? new Date(dto.newEndAt) : undefined,
          valueChange,
          createdById: principal.userId,
        },
      });
      await transaction.contract.update({
        where: { id, companyId: principal.companyId },
        data: {
          totalValue: { increment: valueChange },
          endsAt: dto.newEndAt ? new Date(dto.newEndAt) : undefined,
        },
      });
      return created;
    });
    await this.timeline(
      id,
      principal,
      "AMENDMENT_ADDED",
      `Aditivo ${amendment.number} registrado`,
      dto.description,
      { amendmentId: amendment.id, valueChange, newEndAt: dto.newEndAt },
    );
    await this.audit.record({
      action: "CREATE",
      tableName: "ContractAmendment",
      recordId: amendment.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: { contractId: id, number: amendment.number, valueChange, newEndAt: dto.newEndAt },
      device,
    });
    await this.publish("ContractAmendmentAdded", contract, {
      amendmentId: amendment.id,
      valueChange,
      newEndAt: dto.newEndAt,
    });
    return { ...amendment, valueChange: Number(amendment.valueChange) };
  }

  async allocateVehicle(
    principal: RequestPrincipal,
    id: string,
    dto: AllocateContractVehicleDto,
    device?: RequestDevice,
  ) {
    const contract = await this.requireContract(principal, id);
    if (contract.status !== "ACTIVE")
      throw new BadRequestException("Only active contracts can receive vehicles");
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, companyId: principal.companyId, archivedAt: null },
      select: { id: true, plate: true },
    });
    if (!vehicle) throw new BadRequestException("Invalid vehicle for company scope");
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const allocation = await this.prisma.$transaction(async (transaction) => {
      await transaction.contractVehicleAllocation.updateMany({
        where: { companyId: principal.companyId, vehicleId: vehicle.id, endsAt: null },
        data: { endsAt: startsAt },
      });
      const created = await transaction.contractVehicleAllocation.create({
        data: {
          companyId: principal.companyId,
          contractId: id,
          vehicleId: vehicle.id,
          startsAt,
          monthlyValue: dto.monthlyValue,
          notes: dto.notes,
          allocatedById: principal.userId,
        },
        include: { vehicle: { select: { id: true, plate: true, status: true } } },
      });
      await transaction.vehicle.update({
        where: { id: vehicle.id, companyId: principal.companyId },
        data: { contractId: id },
      });
      return created;
    });
    await this.timeline(
      id,
      principal,
      "VEHICLE_ALLOCATED",
      `Veiculo ${vehicle.plate} alocado`,
      dto.notes,
      { allocationId: allocation.id, vehicleId: vehicle.id },
    );
    await this.audit.record({
      action: "CREATE",
      tableName: "ContractVehicleAllocation",
      recordId: allocation.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: { contractId: id, vehicleId: vehicle.id, startsAt: startsAt.toISOString() },
      device,
    });
    await this.publish("ContractVehicleAllocated", contract, {
      allocationId: allocation.id,
      vehicleId: vehicle.id,
    });
    return allocation;
  }

  async releaseVehicle(
    principal: RequestPrincipal,
    id: string,
    allocationId: string,
    dto: ReleaseContractVehicleDto,
    device?: RequestDevice,
  ) {
    const contract = await this.requireContract(principal, id);
    const allocation = await this.prisma.contractVehicleAllocation.findFirst({
      where: { id: allocationId, contractId: id, companyId: principal.companyId, endsAt: null },
      include: { vehicle: { select: { plate: true } } },
    });
    if (!allocation) throw new NotFoundException("Active allocation not found");
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : new Date();
    await this.prisma.$transaction([
      this.prisma.contractVehicleAllocation.update({
        where: { id: allocation.id, companyId: principal.companyId },
        data: { endsAt },
      }),
      this.prisma.vehicle.updateMany({
        where: { id: allocation.vehicleId, companyId: principal.companyId, contractId: id },
        data: { contractId: null },
      }),
    ]);
    await this.timeline(
      id,
      principal,
      "VEHICLE_RELEASED",
      `Veiculo ${allocation.vehicle.plate} liberado`,
      dto.reason,
      { allocationId, vehicleId: allocation.vehicleId },
    );
    await this.audit.record({
      action: "UPDATE",
      tableName: "ContractVehicleAllocation",
      recordId: allocation.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { endsAt: null },
      newValue: { endsAt: endsAt.toISOString(), reason: dto.reason },
      device,
    });
    await this.publish("ContractVehicleReleased", contract, {
      allocationId,
      vehicleId: allocation.vehicleId,
    });
    return { released: true };
  }

  async addDocument(
    principal: RequestPrincipal,
    id: string,
    dto: CreateContractDocumentDto,
    device?: RequestDevice,
  ) {
    const contract = await this.requireContract(principal, id);
    const document = await this.prisma.contractDocument.create({
      data: {
        companyId: principal.companyId,
        contractId: id,
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
      "Documento contratual anexado",
      undefined,
      { documentId: document.id, type: dto.type },
    );
    await this.audit.record({
      action: "CREATE",
      tableName: "ContractDocument",
      recordId: document.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: { contractId: id, type: dto.type, fileName: dto.fileName },
      device,
    });
    await this.publish("ContractDocumentUploaded", contract, {
      documentId: document.id,
      type: dto.type,
      expiresAt: dto.expiresAt,
    });
    if (dto.expiresAt) await this.scheduleDocument(principal, contract, dto);
    return document;
  }

  async archive(
    principal: RequestPrincipal,
    id: string,
    dto: ArchiveContractDto,
    device?: RequestDevice,
  ) {
    const contract = await this.requireContract(principal, id);
    const archivedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.contractVehicleAllocation.updateMany({
        where: { contractId: id, companyId: principal.companyId, endsAt: null },
        data: { endsAt: archivedAt },
      }),
      this.prisma.vehicle.updateMany({
        where: { contractId: id, companyId: principal.companyId },
        data: { contractId: null },
      }),
      this.prisma.contract.update({
        where: { id, companyId: principal.companyId },
        data: { archivedAt, status: "TERMINATED" },
      }),
    ]);
    await this.timeline(id, principal, "ARCHIVED", "Contrato arquivado", dto.reason);
    await this.audit.record({
      action: "UPDATE",
      tableName: "Contract",
      recordId: id,
      actorId: principal.userId,
      companyId: principal.companyId,
      oldValue: { status: contract.status, archivedAt: contract.archivedAt },
      newValue: { status: "TERMINATED", archivedAt: archivedAt.toISOString(), reason: dto.reason },
      device,
    });
    await this.publish("ContractArchived", contract, {
      archivedAt: archivedAt.toISOString(),
      reason: dto.reason,
    });
    return { archived: true };
  }

  private async requireContract(principal: RequestPrincipal, id: string) {
    const contract = (await this.repository.findById(
      principal.companyId,
      id,
    )) as ContractRecord | null;
    if (
      !contract ||
      (principal.branchId && contract.branchId && principal.branchId !== contract.branchId)
    )
      throw new NotFoundException("Contract not found");
    return contract;
  }
  private validateDates(start: string, end: string) {
    if (new Date(end) <= new Date(start))
      throw new BadRequestException("Contract end date must be after start date");
  }
  private async validateReferences(companyId: string, branchId?: string, managerUserId?: string) {
    const [branch, manager] = await Promise.all([
      branchId ? this.prisma.branch.count({ where: { id: branchId, companyId } }) : 1,
      managerUserId
        ? this.prisma.membership.count({
            where: { userId: managerUserId, companyId, status: "ACTIVE" },
          })
        : 1,
    ]);
    if (!branch || !manager)
      throw new BadRequestException("Invalid contract reference for company scope");
  }
  private createInput(companyId: string, dto: CreateContractDto): Prisma.ContractCreateInput {
    return {
      company: { connect: { id: companyId } },
      branch: dto.branchId ? { connect: { id: dto.branchId } } : undefined,
      manager: dto.managerUserId ? { connect: { id: dto.managerUserId } } : undefined,
      number: dto.number.trim(),
      biddingNumber: dto.biddingNumber,
      title: dto.title.trim(),
      object: dto.object,
      clientName: dto.clientName.trim(),
      clientDocument: dto.clientDocument,
      agency: dto.agency,
      type: dto.type,
      status: dto.status,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      signedAt: dto.signedAt ? new Date(dto.signedAt) : undefined,
      totalValue: dto.totalValue,
      consumedValue: dto.consumedValue,
      guaranteeValue: dto.guaranteeValue,
      renewalNoticeDays: dto.renewalNoticeDays ?? 60,
      notes: dto.notes,
    };
  }
  private updateInput(dto: UpdateContractDto): Prisma.ContractUpdateInput {
    const value = this.createInput("ignored", dto);
    return { ...value, company: undefined };
  }
  private timeline(
    contractId: string,
    principal: RequestPrincipal,
    type: Prisma.ContractTimelineEventCreateInput["type"],
    title: string,
    description?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.contractTimelineEvent.create({
      data: {
        companyId: principal.companyId,
        contractId,
        actorId: principal.userId,
        type,
        title,
        description,
        metadata,
      },
    });
  }
  private publish(name: string, contract: ContractRecord, payload: Prisma.InputJsonValue) {
    return this.events.publish({
      name,
      aggregateType: "Contract",
      aggregateId: contract.id,
      companyId: contract.companyId,
      payload,
    });
  }
  private async scheduleRenewal(principal: RequestPrincipal, contract: ContractRecord) {
    const alert = new Date(contract.endsAt);
    alert.setDate(alert.getDate() - contract.renewalNoticeDays);
    await this.notifications.create({
      companyId: principal.companyId,
      userId: contract.managerUserId ?? principal.userId,
      channel: "INTERNAL",
      category: "contracts.expiry",
      title: "Contrato proximo do vencimento",
      body: `${contract.number} - ${contract.title} vence em ${contract.endsAt.toISOString().slice(0, 10)}.`,
      priority: contract.endsAt < new Date() ? "HIGH" : "NORMAL",
      scheduledAt: alert > new Date() ? alert : undefined,
      metadata: { contractId: contract.id, endsAt: contract.endsAt.toISOString() },
    });
  }
  private async scheduleDocument(
    principal: RequestPrincipal,
    contract: ContractRecord,
    dto: CreateContractDocumentDto,
  ) {
    const expiration = new Date(dto.expiresAt as string);
    const alert = new Date(expiration);
    alert.setDate(alert.getDate() - (dto.alertDaysBefore ?? 30));
    await this.notifications.create({
      companyId: principal.companyId,
      userId: contract.managerUserId ?? principal.userId,
      channel: "INTERNAL",
      category: "contracts.document",
      title: "Documento contratual vencendo",
      body: `${dto.type} do contrato ${contract.number} vence em ${(dto.expiresAt as string).slice(0, 10)}.`,
      priority: expiration < new Date() ? "HIGH" : "NORMAL",
      scheduledAt: alert > new Date() ? alert : undefined,
      metadata: { contractId: contract.id, type: dto.type, expiresAt: dto.expiresAt },
    });
  }
  private auditValue(contract: ContractRecord) {
    return {
      id: contract.id,
      number: contract.number,
      status: contract.status,
      branchId: contract.branchId,
      startsAt: contract.startsAt.toISOString(),
      endsAt: contract.endsAt.toISOString(),
      totalValue: Number(contract.totalValue),
      consumedValue: Number(contract.consumedValue),
    };
  }
  private toResponse(contract: ContractRecord) {
    return {
      ...contract,
      totalValue: Number(contract.totalValue),
      consumedValue: Number(contract.consumedValue),
      guaranteeValue: contract.guaranteeValue == null ? null : Number(contract.guaranteeValue),
      amendments: contract.amendments?.map((item) => ({
        ...item,
        valueChange: Number(item.valueChange),
      })),
      allocations: contract.allocations?.map((item) => ({
        ...item,
        monthlyValue: item.monthlyValue == null ? null : Number(item.monthlyValue),
      })),
    };
  }
}

type ContractRecord = Prisma.ContractGetPayload<{
  include: {
    branch: true;
    manager: true;
    amendments: true;
    documents: true;
    allocations: { include: { vehicle: true } };
    timeline: true;
  };
}>;
