import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { RequestWithContext } from "../context/request-context";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithContext>();

    if (safeMethods.has(request.method)) {
      return true;
    }

    const origin = request.headers.origin;
    const appUrl = this.configService.getOrThrow<string>("APP_URL");

    if (!origin || origin === appUrl) {
      return true;
    }

    throw new ForbiddenException("Invalid request origin");
  }
}
