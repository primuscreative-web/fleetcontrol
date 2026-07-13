import type { Prisma } from "@fleetcontrol/database";

export interface DomainEvent {
  name: string;
  aggregateType: string;
  aggregateId?: string;
  companyId?: string;
  payload: Prisma.InputJsonValue;
}
