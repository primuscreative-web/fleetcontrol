import type { Prisma } from "@fleetcontrol/database";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type {
  PartFilters,
  SupplierFilters,
  SupplyChainRepository,
} from "../application/supply-chain.repository";
@Injectable()
export class PrismaSupplyChainRepository implements SupplyChainRepository {
  constructor(private readonly prisma: PrismaService) {}
  async listSuppliers(f: SupplierFilters) {
    const s = f.search?.trim();
    const where: Prisma.SupplierWhereInput = {
      companyId: f.companyId,
      status: f.status,
      category: f.category,
      archivedAt: null,
      OR: s
        ? [
            { tradeName: { contains: s, mode: "insensitive" } },
            { legalName: { contains: s, mode: "insensitive" } },
            { document: { contains: s } },
            { code: { contains: s, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        include: { _count: { select: { parts: true, purchaseOrders: true, evaluations: true } } },
        orderBy: [{ status: "asc" }, { rating: "desc" }],
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, total };
  }
  findSupplier(companyId: string, id: string) {
    return this.prisma.supplier.findFirst({
      where: { id, companyId, archivedAt: null },
      include: {
        parts: { include: { part: true } },
        purchaseOrders: {
          include: { items: { include: { part: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        evaluations: { orderBy: { createdAt: "desc" }, take: 20 },
        _count: { select: { parts: true, purchaseOrders: true, evaluations: true } },
      },
    });
  }
  createSupplier(data: Prisma.SupplierCreateInput) {
    return this.prisma.supplier.create({ data });
  }
  async listParts(f: PartFilters) {
    const s = f.search?.trim();
    const where: Prisma.PartWhereInput = {
      companyId: f.companyId,
      category: f.category,
      archivedAt: null,
      stockLevels: f.warehouseId ? { some: { warehouseId: f.warehouseId } } : undefined,
      OR: s
        ? [
            { sku: { contains: s, mode: "insensitive" } },
            { name: { contains: s, mode: "insensitive" } },
            { manufacturerCode: { contains: s, mode: "insensitive" } },
            { barcode: { contains: s } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.part.findMany({
        where,
        include: {
          stockLevels: { include: { warehouse: { select: { id: true, name: true, code: true } } } },
          suppliers: {
            include: { supplier: { select: { id: true, tradeName: true, status: true } } },
          },
        },
        orderBy: { name: "asc" },
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
      }),
      this.prisma.part.count({ where }),
    ]);
    return { data, total };
  }
}
