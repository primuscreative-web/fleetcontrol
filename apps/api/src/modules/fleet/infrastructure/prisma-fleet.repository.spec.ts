import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { VehicleListFilters } from "../application/fleet.repository";
import { PrismaFleetRepository } from "./prisma-fleet.repository";

describe("PrismaFleetRepository", () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const update = jest.fn();
  const transaction = jest.fn();
  const prisma = {
    vehicle: { findMany, count, update },
    $transaction: transaction,
  } as unknown as PrismaService;
  const repository = new PrismaFleetRepository(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applies tenant and organizational scope with pagination", async () => {
    findMany.mockReturnValue("find-many-query");
    count.mockReturnValue("count-query");
    transaction.mockResolvedValue([[{ id: "vehicle-1" }], 1]);

    const filters: VehicleListFilters = {
      companyId: "company-1",
      branchId: "branch-1",
      departmentId: "department-1",
      status: "AVAILABLE",
      page: 3,
      pageSize: 25,
      orderBy: "plate",
      orderDirection: "asc",
    };

    await expect(repository.listVehicles(filters)).resolves.toEqual({
      data: [{ id: "vehicle-1" }],
      total: 1,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          branchId: "branch-1",
          departmentId: "department-1",
          status: "AVAILABLE",
          archivedAt: null,
        }),
        orderBy: { plate: "asc" },
        skip: 50,
        take: 25,
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: expect.objectContaining({ companyId: "company-1" }) });
    expect(transaction).toHaveBeenCalledWith(["find-many-query", "count-query"]);
  });

  it("normalizes search and matches supported vehicle relationships", async () => {
    findMany.mockReturnValue("find-many-query");
    count.mockReturnValue("count-query");
    transaction.mockResolvedValue([[], 0]);

    await repository.listVehicles({
      companyId: "company-1",
      search: "  ABC-1234  ",
      page: 1,
      pageSize: 20,
      orderBy: "createdAt",
      orderDirection: "desc",
    });

    const call = findMany.mock.calls[0]?.[0] as { where: { OR: unknown[] } };
    expect(call.where.OR).toHaveLength(8);
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        { plate: { contains: "ABC-1234", mode: "insensitive" } },
        { renavam: { contains: "ABC-1234", mode: "insensitive" } },
        { company: { name: { contains: "ABC-1234", mode: "insensitive" } } },
      ]),
    );
  });

  it("enforces tenant scope in vehicle updates", async () => {
    update.mockResolvedValue({ id: "vehicle-1" });

    await repository.updateVehicle("company-1", "vehicle-1", { status: "STOPPED" });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "vehicle-1", companyId: "company-1" },
        data: { status: "STOPPED" },
      }),
    );
  });
});
