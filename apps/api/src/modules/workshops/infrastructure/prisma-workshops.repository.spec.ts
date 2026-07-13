import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { PrismaWorkshopsRepository } from "./prisma-workshops.repository";
describe("PrismaWorkshopsRepository", () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const findFirst = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    workshop: { findMany, count, findFirst, create: jest.fn() },
    $transaction: transaction,
  } as unknown as PrismaService;
  const repository = new PrismaWorkshopsRepository(prisma);
  beforeEach(() => jest.clearAllMocks());
  it("enforces tenant, branch and pagination scope", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({
      companyId: "company-1",
      branchId: "branch-1",
      status: "APPROVED",
      page: 2,
      pageSize: 25,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          branchId: "branch-1",
          status: "APPROVED",
          archivedAt: null,
        }),
        skip: 25,
        take: 25,
      }),
    );
  });
  it("searches legal, trade, document, code and city fields", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({ companyId: "company-1", search: "Prime", page: 1, pageSize: 20 });
    const query = findMany.mock.calls[0]?.[0] as { where: { OR: unknown[] } };
    expect(query.where.OR).toEqual(
      expect.arrayContaining([
        { tradeName: { contains: "Prime", mode: "insensitive" } },
        { document: { contains: "Prime" } },
      ]),
    );
  });
  it("always scopes detail lookup by company", async () => {
    findFirst.mockResolvedValue(null);
    await repository.findById("company-1", "workshop-1");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "workshop-1", companyId: "company-1", archivedAt: null },
      }),
    );
  });
});
