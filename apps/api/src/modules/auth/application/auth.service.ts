import { randomBytes, createHash } from "crypto";

import { HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";

import type { RequestDevice, RequestPrincipal } from "../../../common/context/request-context";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { AuditService } from "../../audit/application/audit.service";
import { RedisCacheService } from "../../cache/redis-cache.service";
import { EventBusService } from "../../events/application/event-bus.service";
import { MailService } from "../../mail/application/mail.service";
import type { AuthTokenPair } from "../domain/auth-token";

interface SignInInput {
  email: string;
  password: string;
  companyId?: string;
  rememberMe: boolean;
  device?: RequestDevice;
}

interface RefreshInput {
  refreshToken: string;
  device?: RequestDevice;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
    private readonly audit: AuditService,
    private readonly events: EventBusService,
    private readonly mail: MailService,
  ) {}

  async signIn(input: SignInInput): Promise<AuthTokenPair> {
    await this.assertLoginAllowed(input.email, input.device?.ipAddress);

    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        memberships: {
          where: {
            status: "ACTIVE",
            companyId: input.companyId,
          },
          include: { role: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      await this.registerFailedLogin(input.email, input.device?.ipAddress);
      throw new UnauthorizedException("Invalid credentials");
    }

    const membership = user.memberships[0];

    if (!membership) {
      throw new UnauthorizedException("No active company membership");
    }

    const refreshToken = this.createOpaqueToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = this.resolveRefreshExpiration(input.rememberMe);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        companyId: membership.companyId,
        refreshTokenHash,
        rememberMe: input.rememberMe,
        expiresAt,
        ipAddress: input.device?.ipAddress,
        userAgent: input.device?.userAgent,
        browser: input.device?.browser,
        operatingSystem: input.device?.operatingSystem,
        device: input.device?.device,
      },
    });

    await this.clearFailedLogins(input.email, input.device?.ipAddress);
    await this.audit.record({
      action: "LOGIN",
      tableName: "Session",
      recordId: session.id,
      actorId: user.id,
      companyId: membership.companyId,
      device: input.device,
    });
    await this.events.publish({
      name: "LoginSuccess",
      aggregateType: "Session",
      aggregateId: session.id,
      companyId: membership.companyId,
      payload: { userId: user.id },
    });

    return {
      accessToken: await this.issueAccessToken({
        userId: user.id,
        companyId: membership.companyId,
        sessionId: session.id,
        role: membership.role.key,
        branchId: membership.branchId ?? undefined,
        departmentId: membership.departmentId ?? undefined,
      }),
      refreshToken,
      rememberMe: session.rememberMe,
    };
  }

  async refresh(input: RefreshInput): Promise<AuthTokenPair> {
    const refreshTokenHash = this.hashToken(input.refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
      include: {
        user: {
          include: {
            memberships: {
              where: { status: "ACTIVE" },
              include: { role: true },
            },
          },
        },
      },
    });

    if (!session || session.status !== "ACTIVE" || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const membership = session.user.memberships.find(
      (item) => item.companyId === session.companyId,
    );

    if (!membership) {
      throw new UnauthorizedException("No active company membership");
    }

    const refreshToken = this.createOpaqueToken();
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.hashToken(refreshToken),
        lastSeenAt: new Date(),
        ipAddress: input.device?.ipAddress,
        userAgent: input.device?.userAgent,
        browser: input.device?.browser,
        operatingSystem: input.device?.operatingSystem,
        device: input.device?.device,
      },
    });
    await this.cache.delete(`sessions:${session.id}`);

    return {
      accessToken: await this.issueAccessToken({
        userId: session.userId,
        companyId: membership.companyId,
        sessionId: session.id,
        role: membership.role.key,
        branchId: membership.branchId ?? undefined,
        departmentId: membership.departmentId ?? undefined,
      }),
      refreshToken,
      rememberMe: session.rememberMe,
    };
  }

  async logout(principal: RequestPrincipal, device?: RequestDevice): Promise<void> {
    await this.revokeSession(principal.sessionId, principal, device);
    await this.audit.record({
      action: "LOGOUT",
      tableName: "Session",
      recordId: principal.sessionId,
      actorId: principal.userId,
      companyId: principal.companyId,
      device,
    });
  }

  async revokeSession(sessionId: string, principal: RequestPrincipal, device?: RequestDevice) {
    const session = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });
    await this.cache.delete(`sessions:${session.id}`);

    await this.audit.record({
      action: "SESSION_REVOKED",
      tableName: "Session",
      recordId: session.id,
      actorId: principal.userId,
      companyId: principal.companyId,
      device,
    });

    await this.events.publish({
      name: "SessionRevoked",
      aggregateType: "Session",
      aggregateId: session.id,
      companyId: principal.companyId,
      payload: { revokedBy: principal.userId },
    });

    return session;
  }

  listSessions(principal: RequestPrincipal) {
    return this.prisma.session.findMany({
      where: {
        userId: principal.userId,
        companyId: principal.companyId,
        status: "ACTIVE",
      },
      orderBy: { lastSeenAt: "desc" },
    });
  }

  async getProfile(principal: RequestPrincipal) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: principal.userId },
      select: {
        id: true,
        name: true,
        email: true,
        memberships: {
          where: { companyId: principal.companyId, status: "ACTIVE" },
          select: {
            companyId: true,
            branchId: true,
            departmentId: true,
            role: { select: { key: true, name: true } },
            company: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                defaultLanguage: true,
                defaultTimezone: true,
                defaultCurrency: true,
              },
            },
            branch: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
            position: { select: { id: true, name: true } },
          },
        },
      },
    });
    const membership = user.memberships[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: membership?.role,
      company: membership?.company,
      branch: membership?.branch,
      department: membership?.department,
      team: membership?.team,
      position: membership?.position,
      scope: {
        companyId: principal.companyId,
        branchId: principal.branchId,
        departmentId: principal.departmentId,
      },
    };
  }

  async forgotPassword(email: string, companyId?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      return;
    }

    const token = this.createOpaqueToken();
    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash: this.hashToken(token),
        userId: user.id,
        companyId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });
    const resetUrl = new URL("/reset-password", this.configService.getOrThrow<string>("APP_URL"));
    resetUrl.searchParams.set("token", token);

    await this.mail.send({
      to: user.email,
      subject: "Redefinição de senha FleetControl",
      text: `Use o link para redefinir sua senha: ${resetUrl.toString()}`,
      html: `<p>Use o link abaixo para redefinir sua senha:</p><p><a href="${resetUrl.toString()}">Redefinir senha</a></p>`,
    });

    await this.events.publish({
      name: "PasswordResetRequested",
      aggregateType: "User",
      aggregateId: user.id,
      companyId,
      payload: { email: user.email },
    });
  }

  async resetPassword(token: string, password: string, device?: RequestDevice): Promise<void> {
    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });

    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid reset token");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash: await argon2.hash(password),
          passwordChangedAt: new Date(),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: reset.userId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      action: "PASSWORD_CHANGED",
      tableName: "User",
      recordId: reset.userId,
      actorId: reset.userId,
      companyId: reset.companyId ?? undefined,
      device,
    });
    await this.events.publish({
      name: "PasswordChanged",
      aggregateType: "User",
      aggregateId: reset.userId,
      companyId: reset.companyId ?? undefined,
      payload: { source: "reset" },
    });
  }

  async changePassword(
    principal: RequestPrincipal,
    currentPassword: string,
    nextPassword: string,
    device?: RequestDevice,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: principal.userId } });

    if (!(await argon2.verify(user.passwordHash, currentPassword))) {
      throw new UnauthorizedException("Invalid current password");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: principal.userId },
        data: {
          passwordHash: await argon2.hash(nextPassword),
          passwordChangedAt: new Date(),
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: principal.userId, id: { not: principal.sessionId }, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      action: "PASSWORD_CHANGED",
      tableName: "User",
      recordId: principal.userId,
      actorId: principal.userId,
      companyId: principal.companyId,
      device,
    });
    await this.events.publish({
      name: "PasswordChanged",
      aggregateType: "User",
      aggregateId: principal.userId,
      companyId: principal.companyId,
      payload: { source: "authenticated" },
    });
  }

  private async issueAccessToken(payload: {
    userId: string;
    companyId: string;
    sessionId: string;
    role: string;
    branchId?: string;
    departmentId?: string;
  }): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: payload.userId,
        companyId: payload.companyId,
        sessionId: payload.sessionId,
        role: payload.role,
        branchId: payload.branchId,
        departmentId: payload.departmentId,
      },
      {
        secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: Math.floor(
          this.parseDurationMs(this.configService.get<string>("JWT_ACCESS_TTL", "15m")) / 1000,
        ),
      },
    );
  }

  private createOpaqueToken(): string {
    return randomBytes(48).toString("base64url");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private resolveRefreshExpiration(rememberMe: boolean): Date {
    const ttl = rememberMe
      ? this.configService.get<string>("JWT_REMEMBER_ME_REFRESH_TTL", "30d")
      : this.configService.get<string>("JWT_REFRESH_TTL", "7d");

    return new Date(Date.now() + this.parseDurationMs(ttl));
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);

    if (!match) {
      return Number(value);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return amount * multipliers[unit];
  }

  private async assertLoginAllowed(email: string, ipAddress?: string): Promise<void> {
    const count = await this.cache.get<number>(this.loginAttemptKey(email, ipAddress));

    if (count && count >= 10) {
      throw new HttpException("Too many login attempts", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async registerFailedLogin(email: string, ipAddress?: string): Promise<void> {
    await this.cache.increment(this.loginAttemptKey(email, ipAddress), 900);
  }

  private async clearFailedLogins(email: string, ipAddress?: string): Promise<void> {
    await this.cache.delete(this.loginAttemptKey(email, ipAddress));
  }

  private loginAttemptKey(email: string, ipAddress?: string): string {
    return `auth:login-attempts:${email.toLowerCase()}:${ipAddress ?? "unknown"}`;
  }
}
