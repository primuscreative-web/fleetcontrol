import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";

import type { RequestWithContext } from "../context/request-context";

export const CompanyScope = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithContext>();
  return {
    companyId: request.user?.companyId,
    branchId: request.user?.branchId,
    departmentId: request.user?.departmentId,
  };
});
