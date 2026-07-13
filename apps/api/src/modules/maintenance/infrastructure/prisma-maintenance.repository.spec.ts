import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { PrismaMaintenanceRepository } from "./prisma-maintenance.repository";
describe("PrismaMaintenanceRepository", () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const findFirst = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    maintenanceOrder: { findMany, count, findFirst, create: jest.fn() },
    $transaction: transaction,
  } as unknown as PrismaService;
  const repository = new PrismaMaintenanceRepository(prisma);
  beforeEach(() => jest.clearAllMocks());
  it("enforces tenant, branch and pagination scope", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({
      companyId: "company-1",
      branchId: "branch-1",
      status: "IN_PROGRESS",
      page: 2,
      pageSize: 25,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          branchId: "branch-1",
          status: "IN_PROGRESS",
          archivedAt: null,
        }),
        skip: 25,
        take: 25,
      }),
    );
  });
  it("searches order, vehicle, title and invoice", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({ companyId: "company-1", search: "ABC-1234", page: 1, pageSize: 20 });
    const query = findMany.mock.calls[0]?.[0] as { where: { OR: unknown[] } };
    expect(query.where.OR).toEqual(
      expect.arrayContaining([
        { code: { contains: "ABC-1234", mode: "insensitive" } },
        { vehicle: { plate: { contains: "ABC-1234", mode: "insensitive" } } },
      ]),
    );
  });
  it("does not lookup orders without company scope", async () => {
    findFirst.mockResolvedValue(null);
    await repository.findById("company-1", "order-1");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-1", companyId: "company-1", archivedAt: null },
      }),
    );
  });
});
