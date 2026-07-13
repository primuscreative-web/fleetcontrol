import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { PrismaDriversRepository } from "./prisma-drivers.repository";

describe("PrismaDriversRepository", () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const update = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    driver: { findMany, count, update },
    $transaction: transaction,
  } as unknown as PrismaService;
  const repository = new PrismaDriversRepository(prisma);
  beforeEach(() => jest.clearAllMocks());

  it("applies tenant and organizational scope with pagination", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({
      companyId: "company-1",
      branchId: "branch-1",
      status: "ACTIVE",
      page: 2,
      pageSize: 25,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          branchId: "branch-1",
          status: "ACTIVE",
          archivedAt: null,
        }),
        skip: 25,
        take: 25,
      }),
    );
  });

  it("searches driver identity fields", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({ companyId: "company-1", search: " Maria ", page: 1, pageSize: 20 });
    const query = findMany.mock.calls[0]?.[0] as { where: { OR: unknown[] } };
    expect(query.where.OR).toEqual(
      expect.arrayContaining([
        { name: { contains: "Maria", mode: "insensitive" } },
        { cpf: { contains: "Maria" } },
      ]),
    );
  });

  it("enforces tenant scope in updates", async () => {
    update.mockResolvedValue({ id: "driver-1" });
    await repository.update("company-1", "driver-1", { status: "INACTIVE" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "driver-1", companyId: "company-1" } }),
    );
  });
});
