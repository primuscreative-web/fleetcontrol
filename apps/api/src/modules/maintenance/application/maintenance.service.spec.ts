import type { RequestPrincipal } from "../../../common/context/request-context";
import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { AuditService } from "../../audit/application/audit.service";
import type { EventBusService } from "../../events/application/event-bus.service";
import type { NotificationsService } from "../../notifications/application/notifications.service";
import type { MaintenanceRepository } from "./maintenance.repository";
import { MaintenanceService } from "./maintenance.service";
describe("MaintenanceService", () => {
  const findById = jest.fn();
  const repository = { findById } as unknown as MaintenanceRepository;
  const service = new MaintenanceService(
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
  it("conceals orders outside the principal branch", async () => {
    findById.mockResolvedValue(order({ branchId: "branch-2" }));
    await expect(
      service.get({ ...principal, branchId: "branch-1" }, "order-1"),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("rejects completion before execution starts", async () => {
    findById.mockResolvedValue(order({ status: "APPROVED" }));
    await expect(
      service.complete(principal, "order-1", { resolution: "Done" }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("requires a reason when rejecting approval", async () => {
    findById.mockResolvedValue(order({ status: "AWAITING_APPROVAL" }));
    await expect(service.reject(principal, "order-1", {})).rejects.toMatchObject({ status: 400 });
  });
});
function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    companyId: "company-1",
    branchId: null,
    vehicleId: "vehicle-1",
    planId: null,
    code: "OS-1",
    title: "Revision",
    type: "PREVENTIVE",
    priority: "NORMAL",
    status: "AWAITING_APPROVAL",
    odometer: 1000,
    estimatedCost: 100,
    actualCost: 0,
    startedAt: null,
    downtimeStartedAt: null,
    vehicle: { id: "vehicle-1", plate: "ABC-1234", status: "AVAILABLE", currentOdometer: 1000 },
    plan: null,
    requestedBy: null,
    approvedBy: null,
    completedBy: null,
    items: [],
    ...overrides,
  };
}
