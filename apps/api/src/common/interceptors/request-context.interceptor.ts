import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { UAParser } from "ua-parser-js";
import { Observable } from "rxjs";

import type { RequestWithContext } from "../context/request-context";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const userAgent = request.headers["user-agent"];
    const parsed = new UAParser(typeof userAgent === "string" ? userAgent : "").getResult();

    request.device = {
      ipAddress: request.ip,
      userAgent: typeof userAgent === "string" ? userAgent : undefined,
      browser: parsed.browser.name,
      operatingSystem: parsed.os.name,
      device: parsed.device.type ?? "desktop",
    };

    return next.handle();
  }
}
