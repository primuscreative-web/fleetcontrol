import { PrismaClient } from "@fleetcontrol/database";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
