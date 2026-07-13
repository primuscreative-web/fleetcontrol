import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { PrismaContractsRepository } from "./prisma-contracts.repository";
describe("PrismaContractsRepository", () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const update = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    contract: { findMany, count, update },
    $transaction: transaction,
  } as unknown as PrismaService;
  const repository = new PrismaContractsRepository(prisma);
  beforeEach(() => jest.clearAllMocks());
  it("applies tenant scope and pagination", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({
      companyId: "company-1",
      branchId: "branch-1",
      status: "ACTIVE",
      page: 2,
      pageSize: 20,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          branchId: "branch-1",
          status: "ACTIVE",
          archivedAt: null,
        }),
        skip: 20,
        take: 20,
      }),
    );
  });
  it("searches contract and bidding identity", async () => {
    findMany.mockReturnValue("find");
    count.mockReturnValue("count");
    transaction.mockResolvedValue([[], 0]);
    await repository.list({ companyId: "company-1", search: " PE-42 ", page: 1, pageSize: 25 });
    const query = findMany.mock.calls[0]?.[0] as { where: { OR: unknown[] } };
    expect(query.where.OR).toEqual(
      expect.arrayContaining([
        { number: { contains: "PE-42", mode: "insensitive" } },
        { biddingNumber: { contains: "PE-42", mode: "insensitive" } },
      ]),
    );
  });
  it("enforces tenant scope on updates", async () => {
    update.mockResolvedValue({ id: "contract-1" });
    await repository.update("company-1", "contract-1", { status: "SUSPENDED" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "contract-1", companyId: "company-1" } }),
    );
  });
});
