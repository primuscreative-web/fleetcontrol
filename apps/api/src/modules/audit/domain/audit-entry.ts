import type { AuditAction } from "@fleetcontrol/database";
import type { Prisma } from "@fleetcontrol/database";

import type { RequestDevice } from "../../../common/context/request-context";

export interface AuditEntry {
  action: AuditAction;
  tableName: string;
  recordId?: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  actorId?: string;
  companyId?: string;
  device?: RequestDevice;
}
