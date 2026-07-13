import type { RequestPrincipal } from "../../../common/context/request-context";
import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { AuditService } from "../../audit/application/audit.service";
import type { EventBusService } from "../../events/application/event-bus.service";
import type { NotificationsService } from "../../notifications/application/notifications.service";
import type { DriversRepository } from "./drivers.repository";
import { DriversService } from "./drivers.service";

describe("DriversService", () => {
  const findById = jest.fn();
  const repository = { findById } as unknown as DriversRepository;
  const service = new DriversService(
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

  it("rejects vehicle assignment when driver is not active", async () => {
    findById.mockResolvedValue(driver({ status: "SUSPENDED" }));
    await expect(
      service.assignVehicle(principal, "driver-1", { vehicleId: "vehicle-1" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("does not reveal a driver outside the principal branch", async () => {
    findById.mockResolvedValue(driver({ branchId: "branch-2" }));
    await expect(
      service.get({ ...principal, branchId: "branch-1" }, "driver-1"),
    ).rejects.toMatchObject({ status: 404 });
  });
});

function driver(overrides: Record<string, unknown> = {}) {
  return {
    id: "driver-1",
    companyId: "company-1",
    name: "Maria",
    cpf: "12345678901",
    cnhNumber: "123",
    cnhCategory: "D",
    cnhExpiresAt: new Date("2030-01-01"),
    status: "ACTIVE",
    branchId: null,
    departmentId: null,
    archivedAt: null,
    assignments: [],
    documents: [],
    timeline: [],
    ...overrides,
  };
}
