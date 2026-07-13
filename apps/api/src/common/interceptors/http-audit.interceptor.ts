import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";

import type { RequestWithContext } from "../context/request-context";
import { PrismaService } from "../../shared/infrastructure/prisma.service";

const methodAction = {
  POST: "CREATE",
  PUT: "UPDATE",
  PATCH: "UPDATE",
  DELETE: "DELETE",
} as const;

@Injectable()
export class HttpAuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const action = methodAction[request.method as keyof typeof methodAction];

    if (!action || !request.user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        await this.prisma.auditLog.create({
          data: {
            action,
            tableName: "HttpRequest",
            recordId: typeof request.params.id === "string" ? request.params.id : undefined,
            metadata: {
              method: request.method,
              url: request.url,
              params: request.params,
              query: request.query,
            },
            actorId: request.user?.userId,
            companyId: request.user?.companyId,
            ipAddress: request.device?.ipAddress,
            userAgent: request.device?.userAgent,
            browser: request.device?.browser,
            operatingSystem: request.device?.operatingSystem,
            device: request.device?.device,
          },
        });
      }),
    );
  }
}
