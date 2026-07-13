import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { PrismaTiresRepository } from "./prisma-tires.repository";
describe("PrismaTiresRepository", () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const findFirst = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    tire: { findMany, count, findFirst, create: jest.fn() },
    $transaction: transaction,
  } as unknown as PrismaService;
  const repository = new PrismaTiresRepository(prisma);
  beforeEach(() => jest.clearAllMocks());
  it("enforces tenant, branch and pagination scope", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({
      companyId: "company-1",
      branchId: "branch-1",
      status: "INSTALLED",
      page: 2,
      pageSize: 25,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          branchId: "branch-1",
          status: "INSTALLED",
          archivedAt: null,
        }),
        skip: 25,
        take: 25,
      }),
    );
  });
  it("searches identifiers, specification and vehicle plate", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({ companyId: "company-1", search: "ABC", page: 1, pageSize: 20 });
    const query = findMany.mock.calls[0]?.[0] as { where: { OR: unknown[] } };
    expect(query.where.OR).toEqual(
      expect.arrayContaining([
        { serialNumber: { contains: "ABC", mode: "insensitive" } },
        { currentVehicle: { plate: { contains: "ABC", mode: "insensitive" } } },
      ]),
    );
  });
  it("always scopes detail lookup by company", async () => {
    findFirst.mockResolvedValue(null);
    await repository.findById("company-1", "tire-1");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tire-1", companyId: "company-1", archivedAt: null },
      }),
    );
  });
});
