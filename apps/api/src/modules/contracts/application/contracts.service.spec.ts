import type { RequestPrincipal } from "../../../common/context/request-context";
import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { AuditService } from "../../audit/application/audit.service";
import type { EventBusService } from "../../events/application/event-bus.service";
import type { NotificationsService } from "../../notifications/application/notifications.service";
import type { ContractsRepository } from "./contracts.repository";
import { ContractsService } from "./contracts.service";
describe("ContractsService", () => {
  const findById = jest.fn();
  const repository = { findById } as unknown as ContractsRepository;
  const service = new ContractsService(
    repository,
    {} as PrismaService,
    { record: jest.fn() } as unknown as AuditService,
    { publish: jest.fn() } as unknown as EventBusService,
    { create: jest.fn() } as unknown as NotificationsService,
  );
  const principal: RequestPrincipal = {
    userId: "user-1",
    companyId: "company-1",
    sessionId: "session-1",
    role: "manager",
  };
  beforeEach(() => jest.clearAllMocks());
  it("does not reveal a contract outside the principal branch", async () => {
    findById.mockResolvedValue(contract({ branchId: "branch-2" }));
    await expect(
      service.get({ ...principal, branchId: "branch-1" }, "contract-1"),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("rejects vehicle allocation on a non-active contract", async () => {
    findById.mockResolvedValue(contract({ status: "DRAFT" }));
    await expect(
      service.allocateVehicle(principal, "contract-1", { vehicleId: "vehicle-1" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
function contract(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    companyId: "company-1",
    number: "001",
    title: "Transporte",
    status: "ACTIVE",
    branchId: null,
    startsAt: new Date("2026-01-01"),
    endsAt: new Date("2027-01-01"),
    totalValue: 1000,
    consumedValue: 0,
    guaranteeValue: null,
    renewalNoticeDays: 60,
    archivedAt: null,
    allocations: [],
    amendments: [],
    documents: [],
    timeline: [],
    ...overrides,
  };
}
