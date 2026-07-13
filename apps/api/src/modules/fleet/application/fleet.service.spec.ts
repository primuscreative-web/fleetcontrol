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
  const listSavedFilters = jest.fn();
  const findSavedFilter = jest.fn();
  const upsertSavedFilter = jest.fn();
  const updateSavedFilters = jest.fn();
  const deleteSavedFilter = jest.fn();
  const countReference = jest.fn().mockResolvedValue(1);
  const transaction = jest.fn(async (operation: (client: unknown) => unknown) => operation(prisma));
  const prisma = {
    vehicleSavedFilter: {
      findMany: listSavedFilters,
      findFirst: findSavedFilter,
      upsert: upsertSavedFilter,
      updateMany: updateSavedFilters,
      delete: deleteSavedFilter,
    },
    branch: { count: countReference },
    department: { count: countReference },
    costCenter: { count: countReference },
    vehicleCategory: { count: countReference },
    vehicleSubcategory: { count: countReference },
    vehicleMake: { count: countReference },
    vehicleModel: { count: countReference },
    vehicleVersion: { count: countReference },
    $transaction: transaction,
  } as unknown as PrismaService;
  const repository = {
    findVehicleById,
    updateVehicle,
    createTimelineEvent,
  } as unknown as FleetRepository;
  const audit = { record: recordAudit } as unknown as AuditService;
  const events = { publish: publishEvent } as unknown as EventBusService;
  const notifications = { create: createNotification } as unknown as NotificationsService;
  const service = new FleetService(repository, prisma, audit, events, notifications);
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

  it("transfers a vehicle and records old and new organizational scope", async () => {
    const current = vehicle({
      branchId: "branch-1",
      departmentId: "department-1",
      costCenterId: "cost-center-1",
    });
    const transferred = vehicle({
      branchId: "branch-2",
      departmentId: "department-2",
      costCenterId: "cost-center-2",
    });
    findVehicleById.mockResolvedValue(current);
    updateVehicle.mockResolvedValue(transferred);

    await service.transferVehicle(principal, "vehicle-1", {
      branchId: "branch-2",
      departmentId: "department-2",
      costCenterId: "cost-center-2",
      reason: "Realocacao operacional",
    });

    expect(updateVehicle).toHaveBeenCalledWith(
      "company-1",
      "vehicle-1",
      expect.objectContaining({
        branch: { connect: { id: "branch-2" } },
        department: { connect: { id: "department-2" } },
        costCenter: { connect: { id: "cost-center-2" } },
      }),
    );
    expect(createTimelineEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TRANSFERRED", title: "Veiculo transferido" }),
    );
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        oldValue: expect.objectContaining({ branchId: "branch-1" }),
        newValue: expect.objectContaining({ branchId: "branch-2" }),
      }),
    );
    expect(publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: "VehicleTransferred", aggregateId: "vehicle-1" }),
    );
  });

  it("does not reveal a vehicle outside the principal branch", async () => {
    findVehicleById.mockResolvedValue(vehicle({ branchId: "branch-2" }));

    await expect(
      service.archiveVehicle({ ...principal, branchId: "branch-1" }, "vehicle-1", {}),
    ).rejects.toMatchObject({ status: 404 });
    expect(updateVehicle).not.toHaveBeenCalled();
  });

  it("upserts a default saved filter inside the user tenant scope", async () => {
    upsertSavedFilter.mockResolvedValue({
      id: "filter-1",
      name: "Parados",
      filters: { status: "STOPPED" },
      isDefault: true,
    });

    await service.createSavedFilter(principal, {
      name: " Parados ",
      filters: { status: "STOPPED" },
      isDefault: true,
    });

    expect(updateSavedFilters).toHaveBeenCalledWith({
      where: { companyId: "company-1", userId: "user-1", scope: "fleet.vehicles" },
      data: { isDefault: false },
    });
    expect(upsertSavedFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId_userId_scope_name: {
            companyId: "company-1",
            userId: "user-1",
            scope: "fleet.vehicles",
            name: "Parados",
          },
        },
      }),
    );
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ tableName: "VehicleSavedFilter", recordId: "filter-1" }),
    );
  });

  it("refuses to delete a saved filter not owned by the current user", async () => {
    findSavedFilter.mockResolvedValue(null);

    await expect(service.deleteSavedFilter(principal, "filter-2")).rejects.toMatchObject({
      status: 404,
    });
    expect(findSavedFilter).toHaveBeenCalledWith({
      where: {
        id: "filter-2",
        companyId: "company-1",
        userId: "user-1",
        scope: "fleet.vehicles",
      },
    });
    expect(deleteSavedFilter).not.toHaveBeenCalled();
  });

  it("rejects a transfer to an organizational reference from another company", async () => {
    findVehicleById.mockResolvedValue(vehicle());
    countReference.mockResolvedValueOnce(0);

    await expect(
      service.transferVehicle(principal, "vehicle-1", { branchId: "foreign-branch" }),
    ).rejects.toMatchObject({ status: 400 });
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
