import type { Prisma, WorkshopStatus } from "@fleetcontrol/database";
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
  CreateWorkshopDto,
  CreateWorkshopQuoteDto,
  CreateWorkshopServiceDto,
  EvaluateWorkshopDto,
  ListWorkshopQuotesQueryDto,
  ListWorkshopsQueryDto,
  ReviewWorkshopDto,
} from "../presentation/workshops.dto";
import { WORKSHOPS_REPOSITORY, type WorkshopsRepository } from "./workshops.repository";
type WorkshopRecord = Prisma.WorkshopGetPayload<{
  include: { services: true; quotes: true; evaluations: true; _count: true };
}>;
const num = (value: unknown) => (value == null ? null : Number(value));
@Injectable()
export class WorkshopsService {
  constructor(
    @Inject(WORKSHOPS_REPOSITORY) private readonly repository: WorkshopsRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
    private readonly notifications: NotificationsService,
  ) {}
  async list(principal: RequestPrincipal, query: ListWorkshopsQueryDto) {
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
      data: result.data.map((value) => this.response(value as WorkshopRecord)),
      pagination: {
        page,
        pageSize,
        total: result.total,
        pageCount: Math.ceil(result.total / pageSize),
      },
    };
  }
  async get(principal: RequestPrincipal, id: string) {
    return this.response(await this.requireWorkshop(principal, id));
  }
  async dashboard(principal: RequestPrincipal) {
    const scope = {
      companyId: principal.companyId,
      branchId: principal.branchId,
      archivedAt: null,
    };
    const now = new Date();
    const [approved, pending, suspended, activeOrders, quotes, aggregate] =
      await this.prisma.$transaction([
        this.prisma.workshop.count({ where: { ...scope, status: "APPROVED" } }),
        this.prisma.workshop.count({ where: { ...scope, status: "PENDING_APPROVAL" } }),
        this.prisma.workshop.count({ where: { ...scope, status: "SUSPENDED" } }),
        this.prisma.maintenanceOrder.count({
          where: {
            companyId: principal.companyId,
            branchId: principal.branchId,
            workshopId: { not: null },
            status: { in: ["APPROVED", "IN_PROGRESS", "PAUSED"] },
          },
        }),
        this.prisma.workshopQuote.count({
          where: {
            companyId: principal.companyId,
            status: "SUBMITTED",
            OR: [{ validUntil: null }, { validUntil: { gte: now } }],
            maintenanceOrder: { branchId: principal.branchId },
          },
        }),
        this.prisma.workshop.aggregate({
          where: { ...scope, status: "APPROVED" },
          _avg: { rating: true },
          _sum: { totalBilled: true },
        }),
      ]);
    return {
      approved,
      pendingApproval: pending,
      suspended,
      activeOrders,
      submittedQuotes: quotes,
      averageRating: Number(aggregate._avg.rating ?? 0),
      totalBilled: Number(aggregate._sum.totalBilled ?? 0),
    };
  }
  async options(principal: RequestPrincipal) {
    const [workshops, orders] = await this.prisma.$transaction([
      this.prisma.workshop.findMany({
        where: {
          companyId: principal.companyId,
          branchId: principal.branchId,
          status: "APPROVED",
          archivedAt: null,
        },
        select: {
          id: true,
          tradeName: true,
          rating: true,
          paymentTermsDays: true,
          defaultWarrantyDays: true,
        },
        orderBy: { tradeName: "asc" },
      }),
      this.prisma.maintenanceOrder.findMany({
        where: {
          companyId: principal.companyId,
          branchId: principal.branchId,
          archivedAt: null,
          status: { in: ["AWAITING_APPROVAL", "APPROVED"] },
        },
        select: { id: true, code: true, title: true, vehicle: { select: { plate: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return {
      workshops: workshops.map((w) => ({ ...w, rating: Number(w.rating) })),
      orders,
      categories: [
        "GENERAL",
        "ENGINE",
        "TRANSMISSION",
        "ELECTRICAL",
        "BRAKES",
        "SUSPENSION",
        "BODYWORK",
        "TIRES",
        "AIR_CONDITIONING",
        "INSPECTION",
        "TOWING",
      ],
    };
  }
  async create(principal: RequestPrincipal, dto: CreateWorkshopDto, device?: RequestDevice) {
    const branchId = dto.branchId ?? principal.branchId;
    await this.ensureBranch(principal, branchId);
    const workshop = (await this.repository.create({
      company: { connect: { id: principal.companyId } },
      branch: branchId ? { connect: { id: branchId } } : undefined,
      code: dto.code,
      legalName: dto.legalName.trim(),
      tradeName: dto.tradeName.trim(),
      document: dto.document.replace(/\D/g, ""),
      stateRegistration: dto.stateRegistration,
      type: dto.type,
      contactName: dto.contactName,
      email: dto.email?.toLowerCase(),
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      latitude: dto.latitude,
      longitude: dto.longitude,
      paymentTermsDays: dto.paymentTermsDays,
      defaultWarrantyDays: dto.defaultWarrantyDays,
      slaResponseHours: dto.slaResponseHours,
      slaCompletionDays: dto.slaCompletionDays,
      notes: dto.notes,
    })) as WorkshopRecord;
    await this.record("CREATE", "Workshop", workshop.id, principal, device, {
      tradeName: workshop.tradeName,
      document: workshop.document,
      status: workshop.status,
    });
    await this.events.publish({
      name: "WorkshopSubmitted",
      aggregateType: "Workshop",
      aggregateId: workshop.id,
      companyId: principal.companyId,
      payload: { tradeName: workshop.tradeName },
    });
    return this.response(workshop);
  }
  async approve(
    principal: RequestPrincipal,
    id: string,
    dto: ReviewWorkshopDto,
    device?: RequestDevice,
  ) {
    const workshop = await this.requireWorkshop(principal, id);
    if (!(["PENDING_APPROVAL", "REJECTED"] as WorkshopStatus[]).includes(workshop.status))
      throw new ConflictException("Workshop is not awaiting approval");
    await this.prisma.workshop.update({
      where: { id, companyId: principal.companyId },
      data: {
        status: "APPROVED",
        approvedById: principal.userId,
        approvedAt: new Date(),
        suspendedAt: null,
        suspensionReason: null,
        notes: dto.reason ? `${workshop.notes ?? ""}\nApproval: ${dto.reason}`.trim() : undefined,
      },
    });
    await this.transition(workshop, "APPROVED", principal, device, dto.reason);
    return { approved: true };
  }
  async reject(
    principal: RequestPrincipal,
    id: string,
    dto: ReviewWorkshopDto,
    device?: RequestDevice,
  ) {
    const workshop = await this.requireWorkshop(principal, id);
    if (workshop.status !== "PENDING_APPROVAL")
      throw new ConflictException("Workshop is not awaiting approval");
    if (!dto.reason) throw new BadRequestException("Rejection reason is required");
    await this.prisma.workshop.update({
      where: { id, companyId: principal.companyId },
      data: { status: "REJECTED", suspensionReason: dto.reason },
    });
    await this.transition(workshop, "REJECTED", principal, device, dto.reason);
    return { rejected: true };
  }
  async suspend(
    principal: RequestPrincipal,
    id: string,
    dto: ReviewWorkshopDto,
    device?: RequestDevice,
  ) {
    const workshop = await this.requireWorkshop(principal, id);
    if (workshop.status !== "APPROVED")
      throw new ConflictException("Only approved workshops can be suspended");
    if (!dto.reason) throw new BadRequestException("Suspension reason is required");
    const active = await this.prisma.maintenanceOrder.count({
      where: {
        companyId: principal.companyId,
        workshopId: id,
        status: { in: ["APPROVED", "IN_PROGRESS", "PAUSED"] },
      },
    });
    if (active) throw new ConflictException("Workshop has active maintenance orders");
    await this.prisma.workshop.update({
      where: { id, companyId: principal.companyId },
      data: { status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: dto.reason },
    });
    await this.transition(workshop, "SUSPENDED", principal, device, dto.reason);
    return { suspended: true };
  }
  async addService(
    principal: RequestPrincipal,
    id: string,
    dto: CreateWorkshopServiceDto,
    device?: RequestDevice,
  ) {
    await this.requireWorkshop(principal, id);
    const service = await this.prisma.workshopService.create({
      data: {
        companyId: principal.companyId,
        workshopId: id,
        category: dto.category,
        name: dto.name.trim(),
        description: dto.description,
        laborRate: dto.laborRate,
        fixedPrice: dto.fixedPrice,
        estimatedHours: dto.estimatedHours,
        warrantyDays: dto.warrantyDays,
      },
    });
    await this.record("CREATE", "WorkshopService", service.id, principal, device, {
      workshopId: id,
      category: service.category,
      name: service.name,
    });
    return this.serviceResponse(service);
  }
  async quotes(principal: RequestPrincipal, query: ListWorkshopQuotesQueryDto) {
    const values = await this.prisma.workshopQuote.findMany({
      where: {
        companyId: principal.companyId,
        workshopId: query.workshopId,
        maintenanceOrderId: query.maintenanceOrderId,
        status: query.status,
        maintenanceOrder: { branchId: principal.branchId },
      },
      include: {
        workshop: { select: { id: true, tradeName: true, rating: true } },
        maintenanceOrder: { select: { id: true, code: true, title: true, status: true } },
        items: true,
      },
      orderBy: { totalAmount: "asc" },
    });
    return values.map((q) => this.quoteResponse(q));
  }
  async createQuote(
    principal: RequestPrincipal,
    dto: CreateWorkshopQuoteDto,
    device?: RequestDevice,
  ) {
    if (!dto.items.length) throw new BadRequestException("Quote requires at least one item");
    const [workshop, order] = await Promise.all([
      this.requireWorkshop(principal, dto.workshopId),
      this.requireOrder(principal, dto.maintenanceOrderId),
    ]);
    if (workshop.status !== "APPROVED")
      throw new BadRequestException("Only approved workshops can quote");
    if (["IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELLED", "REJECTED"].includes(order.status))
      throw new ConflictException("Maintenance order no longer accepts quotes");
    if (
      await this.prisma.workshopQuote.count({
        where: {
          companyId: principal.companyId,
          maintenanceOrderId: order.id,
          workshopId: workshop.id,
        },
      })
    )
      throw new ConflictException("Workshop already quoted this maintenance order");
    const normalized = dto.items.map((item) => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));
    const parts = normalized
      .filter((i) => i.category === "PART")
      .reduce((sum, item) => sum + item.totalPrice, 0);
    const labor = normalized
      .filter((i) => i.category !== "PART")
      .reduce((sum, item) => sum + item.totalPrice, 0);
    const discount = dto.discountAmount ?? 0;
    if (discount > parts + labor) throw new BadRequestException("Discount exceeds quote amount");
    const quote = await this.prisma.workshopQuote.create({
      data: {
        companyId: principal.companyId,
        workshopId: workshop.id,
        maintenanceOrderId: order.id,
        createdById: principal.userId,
        number: dto.number.trim(),
        status: "SUBMITTED",
        submittedAt: new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        estimatedStartAt: dto.estimatedStartAt ? new Date(dto.estimatedStartAt) : undefined,
        estimatedCompletionAt: dto.estimatedCompletionAt
          ? new Date(dto.estimatedCompletionAt)
          : undefined,
        laborAmount: labor,
        partsAmount: parts,
        discountAmount: discount,
        totalAmount: parts + labor - discount,
        warrantyDays: dto.warrantyDays ?? workshop.defaultWarrantyDays,
        paymentTermsDays: dto.paymentTermsDays ?? workshop.paymentTermsDays,
        notes: dto.notes,
        items: {
          create: normalized.map((item) => ({
            companyId: principal.companyId,
            category: item.category,
            description: item.description,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: { workshop: true, maintenanceOrder: true, items: true },
    });
    await this.record("CREATE", "WorkshopQuote", quote.id, principal, device, {
      workshopId: workshop.id,
      maintenanceOrderId: order.id,
      totalAmount: parts + labor - discount,
    });
    await this.events.publish({
      name: "WorkshopQuoteSubmitted",
      aggregateType: "MaintenanceOrder",
      aggregateId: order.id,
      companyId: principal.companyId,
      payload: {
        quoteId: quote.id,
        workshopId: workshop.id,
        totalAmount: parts + labor - discount,
      },
    });
    return this.quoteResponse(quote);
  }
  async selectQuote(principal: RequestPrincipal, quoteId: string, device?: RequestDevice) {
    const quote = await this.prisma.workshopQuote.findFirst({
      where: { id: quoteId, companyId: principal.companyId },
      include: { workshop: true, maintenanceOrder: true },
    });
    if (!quote || (principal.branchId && quote.maintenanceOrder.branchId !== principal.branchId))
      throw new NotFoundException("Workshop quote not found");
    if (quote.status !== "SUBMITTED") throw new ConflictException("Quote is not selectable");
    if (quote.validUntil && quote.validUntil < new Date())
      throw new BadRequestException("Quote has expired");
    if (quote.workshop.status !== "APPROVED")
      throw new BadRequestException("Workshop is not approved");
    if (!["AWAITING_APPROVAL", "APPROVED"].includes(quote.maintenanceOrder.status))
      throw new ConflictException("Maintenance order does not accept quote selection");
    const selectedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const orderClaim = await tx.maintenanceOrder.updateMany({
        where: {
          id: quote.maintenanceOrderId,
          companyId: principal.companyId,
          workshopId: null,
          status: { in: ["AWAITING_APPROVAL", "APPROVED"] },
        },
        data: {
          workshopId: quote.workshopId,
          estimatedCost: quote.totalAmount,
          scheduledAt: quote.estimatedStartAt ?? undefined,
          warrantyUntil: quote.warrantyDays
            ? new Date(selectedAt.getTime() + quote.warrantyDays * 86_400_000)
            : undefined,
        },
      });
      if (orderClaim.count !== 1)
        throw new ConflictException("Maintenance order already has a selected workshop");
      const claimed = await tx.workshopQuote.updateMany({
        where: { id: quote.id, companyId: principal.companyId, status: "SUBMITTED" },
        data: { status: "SELECTED", selectedAt },
      });
      if (claimed.count !== 1) throw new ConflictException("Quote was already processed");
      await tx.workshopQuote.updateMany({
        where: {
          companyId: principal.companyId,
          maintenanceOrderId: quote.maintenanceOrderId,
          id: { not: quote.id },
          status: { in: ["SUBMITTED", "SELECTED"] },
        },
        data: { status: "REJECTED", rejectionReason: "Another quote was selected" },
      });
      await tx.vehicleTimelineEvent.create({
        data: {
          companyId: principal.companyId,
          vehicleId: quote.maintenanceOrder.vehicleId,
          actorId: principal.userId,
          type: "MAINTENANCE",
          title: "Oficina selecionada",
          description: `${quote.workshop.tradeName} · ${Number(quote.totalAmount).toFixed(2)}`,
          metadata: {
            quoteId: quote.id,
            workshopId: quote.workshopId,
            orderId: quote.maintenanceOrderId,
          },
        },
      });
    });
    await this.record("UPDATE", "WorkshopQuote", quote.id, principal, device, {
      status: "SELECTED",
      maintenanceOrderId: quote.maintenanceOrderId,
    });
    await this.events.publish({
      name: "WorkshopQuoteSelected",
      aggregateType: "MaintenanceOrder",
      aggregateId: quote.maintenanceOrderId,
      companyId: principal.companyId,
      payload: {
        quoteId: quote.id,
        workshopId: quote.workshopId,
        totalAmount: Number(quote.totalAmount),
      },
    });
    return { selected: true };
  }
  async evaluate(
    principal: RequestPrincipal,
    workshopId: string,
    dto: EvaluateWorkshopDto,
    device?: RequestDevice,
  ) {
    const workshop = await this.requireWorkshop(principal, workshopId);
    const order = await this.requireOrder(principal, dto.maintenanceOrderId);
    if (order.status !== "COMPLETED" || order.workshopId !== workshopId)
      throw new BadRequestException("Only completed workshop orders can be evaluated");
    if (
      await this.prisma.workshopEvaluation.count({
        where: { companyId: principal.companyId, maintenanceOrderId: order.id },
      })
    )
      throw new ConflictException("Maintenance order was already evaluated");
    const overall =
      (dto.qualityScore + dto.timelinessScore + dto.serviceScore + dto.costBenefitScore) / 4;
    const evaluation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workshopEvaluation.create({
        data: {
          companyId: principal.companyId,
          workshopId,
          maintenanceOrderId: order.id,
          createdById: principal.userId,
          qualityScore: dto.qualityScore,
          timelinessScore: dto.timelinessScore,
          serviceScore: dto.serviceScore,
          costBenefitScore: dto.costBenefitScore,
          overallScore: overall,
          wouldRecommend: dto.wouldRecommend,
          comments: dto.comments,
        },
      });
      const aggregate = await tx.workshopEvaluation.aggregate({
        where: { companyId: principal.companyId, workshopId },
        _avg: { overallScore: true },
        _count: { _all: true },
      });
      await tx.workshop.update({
        where: { id: workshopId, companyId: principal.companyId },
        data: {
          rating: aggregate._avg.overallScore ?? overall,
          evaluationCount: aggregate._count._all,
        },
      });
      return created;
    });
    await this.record("CREATE", "WorkshopEvaluation", evaluation.id, principal, device, {
      workshopId,
      maintenanceOrderId: order.id,
      overallScore: overall,
    });
    await this.events.publish({
      name: "WorkshopEvaluated",
      aggregateType: "Workshop",
      aggregateId: workshopId,
      companyId: principal.companyId,
      payload: { maintenanceOrderId: order.id, overallScore: overall },
    });
    if (overall < 2.5)
      await this.notifications.create({
        companyId: principal.companyId,
        userId: principal.userId,
        channel: "INTERNAL",
        category: "workshops.performance",
        title: "Oficina com avaliacao critica",
        body: `${workshop.tradeName}: nota ${overall.toFixed(2)}`,
        priority: "HIGH",
        metadata: { workshopId, evaluationId: evaluation.id },
      });
    return { ...evaluation, overallScore: Number(evaluation.overallScore) };
  }
  private async requireWorkshop(principal: RequestPrincipal, id: string) {
    const value = (await this.repository.findById(
      principal.companyId,
      id,
    )) as WorkshopRecord | null;
    if (!value || (principal.branchId && value.branchId !== principal.branchId))
      throw new NotFoundException("Workshop not found");
    return value;
  }
  private async requireOrder(principal: RequestPrincipal, id: string) {
    const order = await this.prisma.maintenanceOrder.findFirst({
      where: { id, companyId: principal.companyId, branchId: principal.branchId, archivedAt: null },
    });
    if (!order) throw new NotFoundException("Maintenance order not found");
    return order;
  }
  private async ensureBranch(principal: RequestPrincipal, id?: string) {
    if (
      id &&
      ((principal.branchId && principal.branchId !== id) ||
        !(await this.prisma.branch.count({ where: { id, companyId: principal.companyId } })))
    )
      throw new BadRequestException("Invalid branch for company scope");
  }
  private async transition(
    workshop: WorkshopRecord,
    status: WorkshopStatus,
    principal: RequestPrincipal,
    device?: RequestDevice,
    reason?: string,
  ) {
    await this.record("UPDATE", "Workshop", workshop.id, principal, device, {
      from: workshop.status,
      to: status,
      reason,
    });
    await this.events.publish({
      name: `Workshop${status.replaceAll("_", "")}`,
      aggregateType: "Workshop",
      aggregateId: workshop.id,
      companyId: principal.companyId,
      payload: { from: workshop.status, to: status, reason },
    });
  }
  private record(
    action: "CREATE" | "UPDATE",
    tableName: string,
    recordId: string,
    principal: RequestPrincipal,
    device: RequestDevice | undefined,
    value: Record<string, unknown>,
  ) {
    return this.audit.record({
      action,
      tableName,
      recordId,
      actorId: principal.userId,
      companyId: principal.companyId,
      newValue: value as Prisma.InputJsonObject,
      device,
    });
  }
  private serviceResponse(value: Prisma.WorkshopServiceGetPayload<Record<string, never>>) {
    return {
      ...value,
      laborRate: num(value.laborRate),
      fixedPrice: num(value.fixedPrice),
      estimatedHours: num(value.estimatedHours),
    };
  }
  private quoteResponse(
    value: Record<string, unknown> & {
      laborAmount: unknown;
      partsAmount: unknown;
      discountAmount: unknown;
      totalAmount: unknown;
      items?: Array<
        Record<string, unknown> & { quantity: unknown; unitPrice: unknown; totalPrice: unknown }
      >;
    },
  ) {
    return {
      ...value,
      laborAmount: Number(value.laborAmount),
      partsAmount: Number(value.partsAmount),
      discountAmount: Number(value.discountAmount),
      totalAmount: Number(value.totalAmount),
      items: value.items?.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };
  }
  private response(value: WorkshopRecord) {
    return {
      ...value,
      latitude: num(value.latitude),
      longitude: num(value.longitude),
      rating: Number(value.rating),
      totalBilled: Number(value.totalBilled),
      services: value.services?.map((item) => this.serviceResponse(item)),
      quotes: value.quotes?.map((item) => this.quoteResponse(item as never)),
      evaluations: value.evaluations?.map((item) => ({
        ...item,
        overallScore: Number(item.overallScore),
      })),
    };
  }
}
