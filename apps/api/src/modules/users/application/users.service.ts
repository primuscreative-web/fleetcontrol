import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { AuditService } from "../../audit/application/audit.service";
import { EventBusService } from "../../events/application/event-bus.service";

interface CreateUserInput {
  companyId: string;
  name: string;
  email: string;
  password: string;
  roleId: string;
  branchId?: string;
  departmentId?: string;
  teamId?: string;
  positionId?: string;
  actorId?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
  ) {}

  async create(input: CreateUserInput) {
    const passwordHash = await argon2.hash(input.password);
    const user = await this.prisma.user.upsert({
      where: { email: input.email.toLowerCase() },
      update: {},
      create: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
      },
    });

    await this.prisma.membership.create({
      data: {
        companyId: input.companyId,
        userId: user.id,
        roleId: input.roleId,
        branchId: input.branchId,
        departmentId: input.departmentId,
        teamId: input.teamId,
        positionId: input.positionId,
      },
    });

    await this.audit.record({
      action: "CREATE",
      tableName: "User",
      recordId: user.id,
      actorId: input.actorId,
      companyId: input.companyId,
      newValue: { id: user.id, email: user.email },
    });
    await this.events.publish({
      name: "UserCreated",
      aggregateType: "User",
      aggregateId: user.id,
      companyId: input.companyId,
      payload: { email: user.email },
    });

    return user;
  }

  list(companyId: string) {
    return this.prisma.user.findMany({
      where: { memberships: { some: { companyId } } },
      include: {
        memberships: {
          where: { companyId },
          include: { role: true, branch: true, department: true, team: true, position: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }
}
