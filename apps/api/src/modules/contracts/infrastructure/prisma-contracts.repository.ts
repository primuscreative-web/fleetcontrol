import type { Prisma } from "@fleetcontrol/database";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { ContractListFilters, ContractsRepository } from "../application/contracts.repository";

const listInclude = {
  branch: true,
  manager: { select: { id: true, name: true, email: true } },
  allocations: {
    where: { endsAt: null },
    include: { vehicle: { select: { id: true, plate: true, status: true } } },
  },
  _count: { select: { documents: true, amendments: true, allocations: true } },
} satisfies Prisma.ContractInclude;

@Injectable()
export class PrismaContractsRepository implements ContractsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async list(filters: ContractListFilters) {
    const search = filters.search?.trim();
    const where: Prisma.ContractWhereInput = {
      companyId: filters.companyId,
      branchId: filters.branchId,
      status: filters.status,
      type: filters.type,
      archivedAt: null,
      OR: search
        ? [
            { number: { contains: search, mode: "insensitive" } },
            { biddingNumber: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
            { clientName: { contains: search, mode: "insensitive" } },
            { agency: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        include: listInclude,
        orderBy: { endsAt: "asc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.contract.count({ where }),
    ]);
    return { data, total };
  }
  findById(companyId: string, id: string) {
    return this.prisma.contract.findFirst({
      where: { id, companyId },
      include: {
        ...listInclude,
        amendments: { orderBy: { effectiveAt: "desc" } },
        documents: { orderBy: [{ expiresAt: "asc" }, { uploadedAt: "desc" }] },
        allocations: {
          orderBy: { startsAt: "desc" },
          include: { vehicle: { select: { id: true, plate: true, status: true } } },
        },
        timeline: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
  }
  create(data: Prisma.ContractCreateInput) {
    return this.prisma.contract.create({ data, include: listInclude });
  }
  update(companyId: string, id: string, data: Prisma.ContractUpdateInput) {
    return this.prisma.contract.update({ where: { id, companyId }, data, include: listInclude });
  }
}
