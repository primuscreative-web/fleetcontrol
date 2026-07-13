import { isRole } from "@fleetcontrol/authz";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { RequestWithContext } from "../context/request-context";
import { RedisCacheService } from "../../modules/cache/redis-cache.service";
import { PrismaService } from "../../shared/infrastructure/prisma.service";

interface AccessTokenPayload {
  sub: string;
  companyId: string;
  sessionId: string;
  role: string;
  branchId?: string;
  departmentId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });

    if (!isRole(payload.role)) {
      throw new UnauthorizedException("Invalid role");
    }

    const sessionCacheKey = `sessions:${payload.sessionId}`;
    const cachedSession = await this.cache.get<{ userId: string; expiresAt: string }>(
      sessionCacheKey,
    );
    const session =
      cachedSession &&
      cachedSession.userId === payload.sub &&
      new Date(cachedSession.expiresAt) > new Date()
        ? cachedSession
        : await this.prisma.session.findFirst({
            where: {
              id: payload.sessionId,
              userId: payload.sub,
              status: "ACTIVE",
              expiresAt: { gt: new Date() },
            },
          });

    if (!session) {
      throw new UnauthorizedException("Session expired");
    }

    if (!cachedSession) {
      await this.cache.set(
        sessionCacheKey,
        {
          userId: session.userId,
          expiresAt:
            session.expiresAt instanceof Date ? session.expiresAt.toISOString() : session.expiresAt,
        },
        60,
      );
    }

    request.user = {
      userId: payload.sub,
      companyId: payload.companyId,
      sessionId: payload.sessionId,
      role: payload.role,
      branchId: payload.branchId,
      departmentId: payload.departmentId,
    };

    return true;
  }

  private extractToken(request: RequestWithContext): string | undefined {
    const authorization = request.headers.authorization;
    const bearer =
      typeof authorization === "string" && authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : undefined;

    return bearer ?? request.cookies?.fleetcontrol_access_token;
  }
}
