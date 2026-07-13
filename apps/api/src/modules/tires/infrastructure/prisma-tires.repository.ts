import type { Prisma } from "@fleetcontrol/database";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { TireFilters, TiresRepository } from "../application/tires.repository";
export const tireInclude = {
  currentVehicle: { select: { id: true, plate: true, status: true, currentOdometer: true } },
  movements: {
    include: {
      fromVehicle: { select: { id: true, plate: true } },
      toVehicle: { select: { id: true, plate: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { occurredAt: "desc" as const },
    take: 30,
  },
  inspections: { orderBy: { inspectedAt: "desc" as const }, take: 20 },
  retreads: { orderBy: { requestedAt: "desc" as const }, take: 10 },
} satisfies Prisma.TireInclude;
@Injectable()
export class PrismaTiresRepository implements TiresRepository {
  constructor(private readonly prisma: PrismaService) {}
  async list(filters: TireFilters) {
    const search = filters.search?.trim();
    const where: Prisma.TireWhereInput = {
      companyId: filters.companyId,
      branchId: filters.branchId,
      status: filters.status,
      condition: filters.condition,
      currentVehicleId: filters.vehicleId,
      archivedAt: null,
      OR: search
        ? [
            { serialNumber: { contains: search, mode: "insensitive" } },
            { fireNumber: { contains: search, mode: "insensitive" } },
            { brand: { contains: search, mode: "insensitive" } },
            { model: { contains: search, mode: "insensitive" } },
            { currentVehicle: { plate: { contains: search, mode: "insensitive" } } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.tire.findMany({
        where,
        include: {
          currentVehicle: { select: { id: true, plate: true } },
          _count: { select: { movements: true, inspections: true, retreads: true } },
        },
        orderBy: [{ condition: "desc" }, { updatedAt: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.tire.count({ where }),
    ]);
    return { data, total };
  }
  findById(companyId: string, id: string) {
    return this.prisma.tire.findFirst({
      where: { id, companyId, archivedAt: null },
      include: tireInclude,
    });
  }
  create(data: Prisma.TireCreateInput) {
    return this.prisma.tire.create({ data, include: tireInclude });
  }
}
