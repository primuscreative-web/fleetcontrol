import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";

import type { RequestWithContext } from "../context/request-context";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<RequestWithContext>();
  return request.user;
});
