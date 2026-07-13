import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(this.configService.getOrThrow<string>("REDIS_URL"), {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureConnected();
    const value = await this.client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.ensureConnected();
    const payload = JSON.stringify(value);

    if (ttlSeconds) {
      await this.client.set(key, payload, "EX", ttlSeconds);
      return;
    }

    await this.client.set(key, payload);
  }

  async delete(key: string): Promise<void> {
    await this.ensureConnected();
    await this.client.del(key);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    await this.ensureConnected();
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, ttlSeconds);
    }

    return count;
  }

  async onModuleDestroy() {
    if (this.client?.status === "ready") {
      await this.client.quit();
    }
  }

  private async ensureConnected() {
    if (this.client.status === "wait") {
      await this.client.connect();
    }
  }
}
