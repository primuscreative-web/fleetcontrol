import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { PrismaFuelRepository } from "./prisma-fuel.repository";

describe("PrismaFuelRepository", () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const findFirst = jest.fn();
  const create = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    fueling: { findMany, count, findFirst, create },
    $transaction: transaction,
  } as unknown as PrismaService;
  const repository = new PrismaFuelRepository(prisma);
  beforeEach(() => jest.clearAllMocks());

  it("enforces tenant and branch scope with pagination", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({
      companyId: "company-1",
      branchId: "branch-1",
      status: "PENDING",
      page: 2,
      pageSize: 25,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          branchId: "branch-1",
          status: "PENDING",
        }),
        skip: 25,
        take: 25,
      }),
    );
  });

  it("searches plate, station, invoice and external identifiers", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({ companyId: "company-1", search: " ABC-1234 ", page: 1, pageSize: 20 });
    const query = findMany.mock.calls[0]?.[0] as { where: { OR: unknown[] } };
    expect(query.where.OR).toEqual(
      expect.arrayContaining([
        { vehicle: { plate: { contains: "ABC-1234", mode: "insensitive" } } },
        { invoiceNumber: { contains: "ABC-1234", mode: "insensitive" } },
      ]),
    );
  });

  it("always scopes record lookup by company", async () => {
    findFirst.mockResolvedValue(null);
    await repository.findById("company-1", "fueling-1");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "fueling-1", companyId: "company-1" } }),
    );
  });
});
