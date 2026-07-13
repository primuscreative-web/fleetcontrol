import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import type { RequestPrincipal } from "../../../common/context/request-context";
import { TenancyService } from "../application/tenancy.service";
import { CreateCompanyDto, CreateNamedEntityDto } from "./tenancy.dto";

@ApiBearerAuth()
@ApiTags("tenancy")
@Controller()
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get("companies")
  @RequirePermissions(permissions.company.read)
  listCompanies(@CurrentUser() user: RequestPrincipal) {
    return this.tenancyService.listCompanies(
      user.role === "globalAdmin" ? undefined : user.companyId,
    );
  }

  @Post("companies")
  @RequirePermissions(permissions.platform.manage)
  createCompany(@CurrentUser() user: RequestPrincipal, @Body() body: CreateCompanyDto) {
    return this.tenancyService.createCompany(body, user.userId);
  }

  @Post("companies/:companyId/branches")
  @RequirePermissions(permissions.branches.manage)
  createBranch(@Param("companyId") companyId: string, @Body() body: CreateNamedEntityDto) {
    return this.tenancyService.createBranch(companyId, body);
  }

  @Get("companies/:companyId/branches")
  @RequirePermissions(permissions.branches.read)
  listBranches(@Param("companyId") companyId: string) {
    return this.tenancyService.listBranches(companyId);
  }

  @Post("companies/:companyId/departments")
  @RequirePermissions(permissions.departments.manage)
  createDepartment(@Param("companyId") companyId: string, @Body() body: CreateNamedEntityDto) {
    return this.tenancyService.createDepartment(companyId, body);
  }

  @Get("companies/:companyId/departments")
  @RequirePermissions(permissions.departments.read)
  listDepartments(@Param("companyId") companyId: string) {
    return this.tenancyService.listDepartments(companyId);
  }

  @Post("companies/:companyId/teams")
  @RequirePermissions(permissions.departments.manage)
  createTeam(@Param("companyId") companyId: string, @Body() body: CreateNamedEntityDto) {
    return this.tenancyService.createTeam(companyId, body);
  }

  @Get("companies/:companyId/teams")
  @RequirePermissions(permissions.departments.read)
  listTeams(@Param("companyId") companyId: string) {
    return this.tenancyService.listTeams(companyId);
  }

  @Post("companies/:companyId/positions")
  @RequirePermissions(permissions.departments.manage)
  createPosition(@Param("companyId") companyId: string, @Body() body: CreateNamedEntityDto) {
    return this.tenancyService.createPosition(companyId, body);
  }

  @Get("companies/:companyId/positions")
  @RequirePermissions(permissions.departments.read)
  listPositions(@Param("companyId") companyId: string) {
    return this.tenancyService.listPositions(companyId);
  }
}
