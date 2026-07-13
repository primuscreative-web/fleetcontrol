import { Injectable } from "@nestjs/common";
import type { NotificationChannel, NotificationPriority, Prisma } from "@fleetcontrol/database";

import { PrismaService } from "../../../shared/infrastructure/prisma.service";
import { EventBusService } from "../../events/application/event-bus.service";
import { MailService } from "../../mail/application/mail.service";

interface CreateNotificationInput {
  companyId?: string;
  userId?: string;
  channel: NotificationChannel;
  category: string;
  title: string;
  body: string;
  priority?: NotificationPriority;
  scheduledAt?: Date;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventBusService,
    private readonly mail: MailService,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        channel: input.channel,
        category: input.category,
        title: input.title,
        body: input.body,
        priority: input.priority ?? "NORMAL",
        status: input.scheduledAt ? "SCHEDULED" : "SENT",
        scheduledAt: input.scheduledAt,
        sentAt: input.scheduledAt ? undefined : new Date(),
        metadata: input.metadata,
      },
    });

    await this.events.publish({
      name: "NotificationCreated",
      aggregateType: "Notification",
      aggregateId: notification.id,
      companyId: notification.companyId ?? undefined,
      payload: { channel: notification.channel, category: notification.category },
    });

    if (notification.channel === "EMAIL" && notification.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: notification.userId } });

      if (user) {
        await this.mail.send({
          to: user.email,
          subject: notification.title,
          text: notification.body,
        });
      }
    }

    return notification;
  }

  list(companyId: string, userId: string, unreadOnly: boolean) {
    return this.prisma.notification.findMany({
      where: {
        companyId,
        userId,
        readAt: unreadOnly ? null : undefined,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id },
      data: {
        status: "READ",
        readAt: new Date(),
        userId,
      },
    });
  }
}
