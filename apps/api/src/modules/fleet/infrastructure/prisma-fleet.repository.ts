import type { Prisma } from "@fleetcontrol/database";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { FleetRepository, VehicleListFilters } from "../application/fleet.repository";

const vehicleInclude = {
  branch: true,
  department: true,
  costCenter: true,
  category: true,
  subcategory: true,
  make: true,
  model: true,
  version: true,
  photos: {
    where: { isPrimary: true },
    take: 1,
    orderBy: { uploadedAt: "desc" as const },
  },
  documents: {
    orderBy: { expiresAt: "asc" as const },
    take: 6,
  },
  _count: {
    select: {
      photos: true,
      documents: true,
      timeline: true,
      costs: true,
    },
  },
} satisfies Prisma.VehicleInclude;

@Injectable()
export class PrismaFleetRepository implements FleetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listVehicles(filters: VehicleListFilters) {
    const where = this.buildWhere(filters);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: vehicleInclude,
        orderBy: { [filters.orderBy]: filters.orderDirection },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { data, total };
  }

  findVehicleById(companyId: string, id: string) {
    return this.prisma.vehicle.findFirst({
      where: { id, companyId },
      include: {
        ...vehicleInclude,
        photos: { orderBy: [{ isPrimary: "desc" }, { uploadedAt: "desc" }] },
        documents: { orderBy: [{ expiresAt: "asc" }, { uploadedAt: "desc" }] },
        timeline: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { actor: { select: { id: true, name: true, email: true } } },
        },
        costs: { orderBy: { month: "desc" }, take: 24 },
      },
    });
  }

  createVehicle(data: Prisma.VehicleCreateInput) {
    return this.prisma.vehicle.create({ data, include: vehicleInclude });
  }

  updateVehicle(companyId: string, id: string, data: Prisma.VehicleUpdateInput) {
    return this.prisma.vehicle.update({
      where: { id, companyId },
      data,
      include: vehicleInclude,
    });
  }

  createTimelineEvent(data: Prisma.VehicleTimelineEventCreateInput) {
    return this.prisma.vehicleTimelineEvent.create({ data });
  }

  addPhoto(data: Prisma.VehiclePhotoCreateInput) {
    return this.prisma.vehiclePhoto.create({ data });
  }

  addDocument(data: Prisma.VehicleDocumentCreateInput) {
    return this.prisma.vehicleDocument.create({ data });
  }

  private buildWhere(filters: VehicleListFilters): Prisma.VehicleWhereInput {
    const searchable = filters.search?.trim();

    return {
      companyId: filters.companyId,
      branchId: filters.branchId,
      departmentId: filters.departmentId,
      status: filters.status as Prisma.VehicleWhereInput["status"],
      categoryId: filters.categoryId,
      makeId: filters.makeId,
      modelId: filters.modelId,
      archivedAt: null,
      OR: searchable
        ? [
            { plate: { contains: searchable, mode: "insensitive" } },
            { renavam: { contains: searchable, mode: "insensitive" } },
            { chassis: { contains: searchable, mode: "insensitive" } },
            { category: { name: { contains: searchable, mode: "insensitive" } } },
            { make: { name: { contains: searchable, mode: "insensitive" } } },
            { model: { name: { contains: searchable, mode: "insensitive" } } },
            { branch: { name: { contains: searchable, mode: "insensitive" } } },
            { company: { name: { contains: searchable, mode: "insensitive" } } },
          ]
        : undefined,
    };
  }
}
