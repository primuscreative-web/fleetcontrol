import type { RequestPrincipal } from "../../../common/context/request-context";
import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { AuditService } from "../../audit/application/audit.service";
import type { EventBusService } from "../../events/application/event-bus.service";
import type { NotificationsService } from "../../notifications/application/notifications.service";
import type { TiresRepository } from "./tires.repository";
import { TiresService } from "./tires.service";
describe("TiresService", () => {
  const findById = jest.fn();
  const repository = { findById } as unknown as TiresRepository;
  const service = new TiresService(
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
  it("conceals tires from another branch", async () => {
    findById.mockResolvedValue(tire({ branchId: "branch-2" }));
    await expect(
      service.get({ ...principal, branchId: "branch-1" }, "tire-1"),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("never installs a condemned tire", async () => {
    findById.mockResolvedValue(tire({ condition: "CONDEMNED" }));
    await expect(
      service.install(principal, "tire-1", {
        vehicleId: "vehicle-1",
        position: "FRONT_LEFT",
        odometer: 1000,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("rejects removal with an odometer rollback", async () => {
    findById.mockResolvedValue(
      tire({ status: "INSTALLED", currentVehicleId: "vehicle-1", installedOdometer: 2000 }),
    );
    await expect(
      service.remove(principal, "tire-1", { odometer: 1900, reason: "Test" }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("requires removal before scrapping", async () => {
    findById.mockResolvedValue(tire({ status: "INSTALLED", currentVehicleId: "vehicle-1" }));
    await expect(service.scrap(principal, "tire-1", { reason: "Damage" })).rejects.toMatchObject({
      status: 409,
    });
  });
});
function tire(overrides: Record<string, unknown> = {}) {
  return {
    id: "tire-1",
    companyId: "company-1",
    branchId: null,
    serialNumber: "SN-1",
    brand: "Brand",
    model: "Model",
    size: "275/80R22.5",
    status: "IN_STOCK",
    condition: "GOOD",
    currentVehicleId: null,
    currentPosition: null,
    purchaseCost: 1000,
    installedOdometer: null,
    accumulatedKm: 0,
    initialTreadDepthMm: 16,
    currentTreadDepthMm: 16,
    minimumTreadDepthMm: 1.6,
    recommendedPressurePsi: 110,
    retreadCount: 0,
    maxRetreads: 2,
    totalLifecycleCost: 1000,
    currentVehicle: null,
    movements: [],
    inspections: [],
    retreads: [],
    ...overrides,
  };
}
