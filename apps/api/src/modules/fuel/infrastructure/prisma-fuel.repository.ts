import type { Prisma } from "@fleetcontrol/database";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { FuelingFilters, FuelRepository } from "../application/fuel.repository";
export const fuelingInclude = {
  station: true,
  vehicle: { select: { id: true, plate: true, status: true } },
  driver: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
} satisfies Prisma.FuelingInclude;
@Injectable()
export class PrismaFuelRepository implements FuelRepository {
  constructor(private readonly prisma: PrismaService) {}
  async list(filters: FuelingFilters) {
    const search = filters.search?.trim();
    const where: Prisma.FuelingWhereInput = {
      companyId: filters.companyId,
      branchId: filters.branchId,
      status: filters.status,
      vehicleId: filters.vehicleId,
      stationId: filters.stationId,
      OR: search
        ? [
            { vehicle: { plate: { contains: search, mode: "insensitive" } } },
            { station: { name: { contains: search, mode: "insensitive" } } },
            { invoiceNumber: { contains: search, mode: "insensitive" } },
            { externalId: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.fueling.findMany({
        where,
        include: fuelingInclude,
        orderBy: { fueledAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.fueling.count({ where }),
    ]);
    return { data, total };
  }
  findById(companyId: string, id: string) {
    return this.prisma.fueling.findFirst({ where: { id, companyId }, include: fuelingInclude });
  }
  create(data: Prisma.FuelingCreateInput) {
    return this.prisma.fueling.create({ data, include: fuelingInclude });
  }
}
