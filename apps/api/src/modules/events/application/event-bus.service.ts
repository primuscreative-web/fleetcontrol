import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import type { DomainEvent } from "../domain/domain-event";

@Injectable()
export class EventBusService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        name: event.name,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        companyId: event.companyId,
        payload: event.payload,
      },
    });
  }
}
