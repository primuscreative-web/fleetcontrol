import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";

import { StructuredLogger } from "../logging/structured-logger.service";

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; url: string }>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          JSON.stringify({
            method: request.method,
            url: request.url,
            durationMs: Date.now() - startedAt,
          }),
          RequestLoggerInterceptor.name,
        );
      }),
    );
  }
}
