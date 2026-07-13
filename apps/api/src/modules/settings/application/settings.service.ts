import { Injectable } from "@nestjs/common";
import type { Prisma } from "@fleetcontrol/database";

import { RedisCacheService } from "../../cache/redis-cache.service";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async get(companyId: string | undefined, scope: string, key: string) {
    const cacheKey = `settings:${companyId ?? "system"}:${scope}:${key}`;
    const cached = await this.cache.get<unknown>(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const setting = await this.prisma.setting.findUnique({
      where: {
        ownerId_scope_key: {
          ownerId: companyId ?? "system",
          scope,
          key,
        },
      },
    });

    if (setting) {
      await this.cache.set(cacheKey, setting.value, 300);
    }

    return setting?.value ?? null;
  }

  async upsert(
    companyId: string | undefined,
    scope: string,
    key: string,
    value: Prisma.InputJsonValue,
  ) {
    const setting = await this.prisma.setting.upsert({
      where: {
        ownerId_scope_key: {
          ownerId: companyId ?? "system",
          scope,
          key,
        },
      },
      update: { value },
      create: { ownerId: companyId ?? "system", companyId, scope, key, value },
    });

    await this.cache.delete(`settings:${companyId ?? "system"}:${scope}:${key}`);
    return setting;
  }
}
