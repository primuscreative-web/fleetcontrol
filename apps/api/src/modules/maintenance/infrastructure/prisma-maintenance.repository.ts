import type { Prisma } from "@fleetcontrol/database";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type {
  MaintenanceFilters,
  MaintenanceRepository,
} from "../application/maintenance.repository";
export const maintenanceInclude = {
  vehicle: { select: { id: true, plate: true, status: true, currentOdometer: true } },
  plan: { select: { id: true, name: true } },
  requestedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  completedBy: { select: { id: true, name: true } },
  items: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.MaintenanceOrderInclude;
@Injectable()
export class PrismaMaintenanceRepository implements MaintenanceRepository {
  constructor(private readonly prisma: PrismaService) {}
  async list(filters: MaintenanceFilters) {
    const search = filters.search?.trim();
    const where: Prisma.MaintenanceOrderWhereInput = {
      companyId: filters.companyId,
      branchId: filters.branchId,
      status: filters.status,
      type: filters.type,
      priority: filters.priority,
      vehicleId: filters.vehicleId,
      archivedAt: null,
      OR: search
        ? [
            { code: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
            { vehicle: { plate: { contains: search, mode: "insensitive" } } },
            { invoiceNumber: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.maintenanceOrder.findMany({
        where,
        include: maintenanceInclude,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.maintenanceOrder.count({ where }),
    ]);
    return { data, total };
  }
  findById(companyId: string, id: string) {
    return this.prisma.maintenanceOrder.findFirst({
      where: { id, companyId, archivedAt: null },
      include: maintenanceInclude,
    });
  }
  create(data: Prisma.MaintenanceOrderCreateInput) {
    return this.prisma.maintenanceOrder.create({ data, include: maintenanceInclude });
  }
}
