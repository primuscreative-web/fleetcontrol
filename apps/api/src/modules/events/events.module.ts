import { Global, Module } from "@nestjs/common";

import { EventBusService } from "./application/event-bus.service";
import { EventsController } from "./presentation/events.controller";

@Global()
@Module({
  controllers: [EventsController],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventsModule {}
