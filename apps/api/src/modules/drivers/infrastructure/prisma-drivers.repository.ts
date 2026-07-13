import type { Prisma } from "@fleetcontrol/database";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { DriverListFilters, DriversRepository } from "../application/drivers.repository";

export const driverListInclude = {
  branch: true,
  department: true,
  assignments: {
    where: { endsAt: null },
    take: 1,
    orderBy: { startsAt: "desc" as const },
    include: { vehicle: { select: { id: true, plate: true, status: true } } },
  },
  _count: { select: { documents: true, assignments: true } },
} satisfies Prisma.DriverInclude;

@Injectable()
export class PrismaDriversRepository implements DriversRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: DriverListFilters) {
    const search = filters.search?.trim();
    const where: Prisma.DriverWhereInput = {
      companyId: filters.companyId,
      branchId: filters.branchId,
      departmentId: filters.departmentId,
      status: filters.status,
      archivedAt: null,
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" } },
            { cpf: { contains: search } },
            { cnhNumber: { contains: search } },
            { email: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.driver.findMany({
        where,
        include: driverListInclude,
        orderBy: { name: "asc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.driver.count({ where }),
    ]);
    return { data, total };
  }

  findById(companyId: string, id: string) {
    return this.prisma.driver.findFirst({
      where: { id, companyId },
      include: {
        ...driverListInclude,
        documents: { orderBy: [{ expiresAt: "asc" }, { uploadedAt: "desc" }] },
        assignments: {
          orderBy: { startsAt: "desc" },
          include: { vehicle: { select: { id: true, plate: true, status: true } } },
        },
        timeline: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
  }

  create(data: Prisma.DriverCreateInput) {
    return this.prisma.driver.create({ data, include: driverListInclude });
  }

  update(companyId: string, id: string, data: Prisma.DriverUpdateInput) {
    return this.prisma.driver.update({
      where: { id, companyId },
      data,
      include: driverListInclude,
    });
  }
}
