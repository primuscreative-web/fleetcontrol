import { Module } from "@nestjs/common";

import { EventsModule } from "../events/events.module";
import { MailModule } from "../mail/mail.module";
import { NotificationsService } from "./application/notifications.service";
import { NotificationsController } from "./presentation/notifications.controller";

@Module({
  imports: [EventsModule, MailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
