import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { AuditService } from "../../audit/application/audit.service";
import { EventBusService } from "../../events/application/event-bus.service";

@Injectable()
export class TenancyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
  ) {}

  async createCompany(
    data: { name: string; legalName?: string; document?: string },
    actorId?: string,
  ) {
    const company = await this.prisma.company.create({ data });

    await this.audit.record({
      action: "CREATE",
      tableName: "Company",
      recordId: company.id,
      actorId,
      companyId: company.id,
      newValue: {
        id: company.id,
        name: company.name,
        status: company.status,
      },
    });
    await this.events.publish({
      name: "CompanyCreated",
      aggregateType: "Company",
      aggregateId: company.id,
      companyId: company.id,
      payload: { name: company.name },
    });

    return company;
  }

  listCompanies(companyId?: string) {
    return this.prisma.company.findMany({
      where: { id: companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  createBranch(companyId: string, data: { name: string; code?: string }) {
    return this.prisma.branch.create({ data: { ...data, companyId } });
  }

  listBranches(companyId: string) {
    return this.prisma.branch.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
  }

  createDepartment(companyId: string, data: { name: string; code?: string; branchId?: string }) {
    return this.prisma.department.create({ data: { ...data, companyId } });
  }

  listDepartments(companyId: string) {
    return this.prisma.department.findMany({
      where: { companyId },
      include: { branch: true },
      orderBy: { name: "asc" },
    });
  }

  createTeam(companyId: string, data: { name: string; departmentId?: string }) {
    return this.prisma.team.create({ data: { ...data, companyId } });
  }

  listTeams(companyId: string) {
    return this.prisma.team.findMany({
      where: { companyId },
      include: { department: true },
      orderBy: { name: "asc" },
    });
  }

  createPosition(companyId: string, data: { name: string }) {
    return this.prisma.position.create({ data: { ...data, companyId } });
  }

  listPositions(companyId: string) {
    return this.prisma.position.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
  }
}
