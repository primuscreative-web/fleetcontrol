import { hasPermission, isWithinScope, type Permission } from "@fleetcontrol/authz";
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import type { RequestWithContext } from "../context/request-context";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const principal = request.user;

    if (!principal) {
      throw new ForbiddenException("Missing authenticated principal");
    }

    const hasRequiredPermissions = requiredPermissions.every((permission) =>
      hasPermission(principal.role, permission),
    );

    if (!hasRequiredPermissions) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const requestedCompanyId =
      request.params.companyId ?? request.query.companyId ?? request.body?.companyId;
    const requestedBranchId =
      request.params.branchId ?? request.query.branchId ?? request.body?.branchId;
    const requestedDepartmentId =
      request.params.departmentId ?? request.query.departmentId ?? request.body?.departmentId;

    const withinScope = isWithinScope(
      {
        companyId: typeof requestedCompanyId === "string" ? requestedCompanyId : undefined,
        branchId: typeof requestedBranchId === "string" ? requestedBranchId : undefined,
        departmentId: typeof requestedDepartmentId === "string" ? requestedDepartmentId : undefined,
      },
      principal,
    );

    if (!withinScope) {
      throw new ForbiddenException("Requested scope is outside the authenticated company context");
    }

    return true;
  }
}
