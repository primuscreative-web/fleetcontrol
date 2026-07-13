import type { RequestPrincipal } from "../../../common/context/request-context";
import type { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { AuditService } from "../../audit/application/audit.service";
import type { EventBusService } from "../../events/application/event-bus.service";
import type { NotificationsService } from "../../notifications/application/notifications.service";
import type { FleetRepository } from "./fleet.repository";
import { FleetService } from "./fleet.service";

describe("FleetService", () => {
  const findVehicleById = jest.fn();
  const updateVehicle = jest.fn();
  const createTimelineEvent = jest.fn();
  const recordAudit = jest.fn();
  const publishEvent = jest.fn();
  const createNotification = jest.fn();
  const repository = {
    findVehicleById,
    updateVehicle,
    createTimelineEvent,
  } as unknown as FleetRepository;
  const audit = { record: recordAudit } as unknown as AuditService;
  const events = { publish: publishEvent } as unknown as EventBusService;
  const notifications = { create: createNotification } as unknown as NotificationsService;
  const service = new FleetService(repository, {} as PrismaService, audit, events, notifications);
  const principal: RequestPrincipal = {
    userId: "user-1",
    companyId: "company-1",
    sessionId: "session-1",
    role: "manager",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createTimelineEvent.mockResolvedValue({ id: "timeline-1" });
    recordAudit.mockResolvedValue({ id: "audit-1" });
    publishEvent.mockResolvedValue({ id: "event-1" });
    createNotification.mockResolvedValue({ id: "notification-1" });
  });

  it("archives a vehicle and emits the complete lifecycle trail", async () => {
    const current = vehicle({ status: "AVAILABLE", archivedAt: null });
    const archived = vehicle({ status: "INACTIVE", archivedAt: new Date() });
    findVehicleById.mockResolvedValue(current);
    updateVehicle.mockResolvedValue(archived);

    const result = await service.archiveVehicle(principal, "vehicle-1", {
      reason: "Fim do contrato",
    });

    expect(updateVehicle).toHaveBeenCalledWith(
      "company-1",
      "vehicle-1",
      expect.objectContaining({ status: "INACTIVE", archivedAt: expect.any(Date) }),
    );
    expect(createTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ARCHIVED",
        title: "Veiculo arquivado",
        description: "Fim do contrato",
      }),
    );
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        tableName: "Vehicle",
        recordId: "vehicle-1",
        companyId: "company-1",
      }),
    );
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: "VehicleArchived", aggregateId: "vehicle-1" }),
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ category: "fleet.lifecycle", companyId: "company-1" }),
    );
    expect(result).toEqual(expect.objectContaining({ id: "vehicle-1", status: "INACTIVE" }));
  });

  it("does not reveal a vehicle outside the principal branch", async () => {
    findVehicleById.mockResolvedValue(vehicle({ branchId: "branch-2" }));

    await expect(
      service.archiveVehicle({ ...principal, branchId: "branch-1" }, "vehicle-1", {}),
    ).rejects.toMatchObject({ status: 404 });
    expect(updateVehicle).not.toHaveBeenCalled();
  });
});

function vehicle(overrides: Record<string, unknown> = {}) {
  return {
    id: "vehicle-1",
    companyId: "company-1",
    plate: "ABC1D23",
    status: "AVAILABLE",
    branchId: null,
    departmentId: null,
    costCenterId: null,
    archivedAt: null,
    grossWeight: null,
    netWeight: null,
    estimatedValue: null,
    currentOdometer: null,
    photos: [],
    documents: [],
    timeline: [],
    costs: [],
    ...overrides,
  };
}
