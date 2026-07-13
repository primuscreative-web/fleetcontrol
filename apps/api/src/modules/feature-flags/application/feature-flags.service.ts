import { Injectable } from "@nestjs/common";
import type { Prisma } from "@fleetcontrol/database";

import { RedisCacheService } from "../../cache/redis-cache.service";
import { PrismaService } from "../../../shared/infrastructure/prisma.service";

@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async isEnabled(companyId: string | undefined, key: string): Promise<boolean> {
    const cacheKey = `feature-flags:${companyId ?? "system"}:${key}`;
    const cached = await this.cache.get<boolean>(cacheKey);

    if (typeof cached === "boolean") {
      return cached;
    }

    const flag = await this.prisma.featureFlag.findUnique({
      where: {
        ownerId_key: {
          ownerId: companyId ?? "system",
          key,
        },
      },
    });
    const enabled = flag?.status === "ENABLED";
    await this.cache.set(cacheKey, enabled, 300);
    return enabled;
  }

  async upsert(
    companyId: string | undefined,
    key: string,
    enabled: boolean,
    description?: string,
    rules?: Prisma.InputJsonValue,
  ) {
    const flag = await this.prisma.featureFlag.upsert({
      where: {
        ownerId_key: {
          ownerId: companyId ?? "system",
          key,
        },
      },
      update: {
        status: enabled ? "ENABLED" : "DISABLED",
        description,
        rules,
      },
      create: {
        companyId,
        ownerId: companyId ?? "system",
        key,
        status: enabled ? "ENABLED" : "DISABLED",
        description,
        rules,
      },
    });

    await this.cache.delete(`feature-flags:${companyId ?? "system"}:${key}`);
    return flag;
  }
}
