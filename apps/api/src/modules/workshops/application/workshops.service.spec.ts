import type { RequestPrincipal } from "../../../common/context/request-context";
import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { AuditService } from "../../audit/application/audit.service";
import type { EventBusService } from "../../events/application/event-bus.service";
import type { NotificationsService } from "../../notifications/application/notifications.service";
import type { WorkshopsRepository } from "./workshops.repository";
import { WorkshopsService } from "./workshops.service";
describe("WorkshopsService", () => {
  const findById = jest.fn();
  const repository = { findById } as unknown as WorkshopsRepository;
  const service = new WorkshopsService(
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
  it("conceals workshops from another branch", async () => {
    findById.mockResolvedValue(workshop({ branchId: "branch-2" }));
    await expect(
      service.get({ ...principal, branchId: "branch-1" }, "workshop-1"),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("requires a reason to reject homologation", async () => {
    findById.mockResolvedValue(workshop());
    await expect(service.reject(principal, "workshop-1", {})).rejects.toMatchObject({
      status: 400,
    });
  });
  it("does not approve an already approved workshop", async () => {
    findById.mockResolvedValue(workshop({ status: "APPROVED" }));
    await expect(service.approve(principal, "workshop-1", {})).rejects.toMatchObject({
      status: 409,
    });
  });
});
function workshop(overrides: Record<string, unknown> = {}) {
  return {
    id: "workshop-1",
    companyId: "company-1",
    branchId: null,
    tradeName: "Prime",
    legalName: "Prime Ltda",
    document: "123",
    type: "EXTERNAL",
    status: "PENDING_APPROVAL",
    rating: 0,
    evaluationCount: 0,
    totalBilled: 0,
    services: [],
    quotes: [],
    evaluations: [],
    _count: { maintenanceOrders: 0, quotes: 0, evaluations: 0 },
    ...overrides,
  };
}
