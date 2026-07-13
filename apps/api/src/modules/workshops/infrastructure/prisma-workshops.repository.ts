import type { Prisma } from "@fleetcontrol/database";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { WorkshopFilters, WorkshopsRepository } from "../application/workshops.repository";
export const workshopInclude = {
  services: { orderBy: [{ active: "desc" as const }, { name: "asc" as const }] },
  quotes: {
    include: {
      maintenanceOrder: { select: { id: true, code: true, title: true, status: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  },
  evaluations: {
    include: { maintenanceOrder: { select: { id: true, code: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 20,
  },
  _count: { select: { maintenanceOrders: true, quotes: true, evaluations: true } },
} satisfies Prisma.WorkshopInclude;
@Injectable()
export class PrismaWorkshopsRepository implements WorkshopsRepository {
  constructor(private readonly prisma: PrismaService) {}
  async list(filters: WorkshopFilters) {
    const search = filters.search?.trim();
    const where: Prisma.WorkshopWhereInput = {
      companyId: filters.companyId,
      branchId: filters.branchId,
      status: filters.status,
      type: filters.type,
      city: filters.city ? { contains: filters.city, mode: "insensitive" } : undefined,
      archivedAt: null,
      OR: search
        ? [
            { tradeName: { contains: search, mode: "insensitive" } },
            { legalName: { contains: search, mode: "insensitive" } },
            { document: { contains: search } },
            { code: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workshop.findMany({
        where,
        include: {
          services: { where: { active: true }, select: { id: true, name: true, category: true } },
          _count: { select: { maintenanceOrders: true, quotes: true, evaluations: true } },
        },
        orderBy: [{ status: "asc" }, { rating: "desc" }, { tradeName: "asc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.workshop.count({ where }),
    ]);
    return { data, total };
  }
  findById(companyId: string, id: string) {
    return this.prisma.workshop.findFirst({
      where: { id, companyId, archivedAt: null },
      include: workshopInclude,
    });
  }
  create(data: Prisma.WorkshopCreateInput) {
    return this.prisma.workshop.create({ data, include: workshopInclude });
  }
}
