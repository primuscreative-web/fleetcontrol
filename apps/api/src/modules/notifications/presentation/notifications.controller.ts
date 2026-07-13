import { permissions } from "@fleetcontrol/authz";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/permissions.decorator";
import type { RequestPrincipal } from "../../../common/context/request-context";
import { NotificationsService } from "../application/notifications.service";

class CreateNotificationDto {
  @IsString()
  category!: string;

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsIn(["INTERNAL", "EMAIL", "PUSH", "WHATSAPP", "SMS"])
  channel!: "INTERNAL" | "EMAIL" | "PUSH" | "WHATSAPP" | "SMS";

  @IsOptional()
  @IsIn(["LOW", "NORMAL", "HIGH", "CRITICAL"])
  priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

  @IsOptional()
  @IsString()
  userId?: string;
}

@ApiBearerAuth()
@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions(permissions.notifications.read)
  list(@CurrentUser() user: RequestPrincipal, @Query("unreadOnly") unreadOnly?: string) {
    return this.notificationsService.list(user.companyId, user.userId, unreadOnly === "true");
  }

  @Post()
  @RequirePermissions(permissions.notifications.manage)
  create(@CurrentUser() user: RequestPrincipal, @Body() body: CreateNotificationDto) {
    return this.notificationsService.create({
      ...body,
      companyId: user.companyId,
      userId: body.userId,
    });
  }

  @Patch(":id/read")
  @RequirePermissions(permissions.notifications.read)
  markAsRead(@CurrentUser() user: RequestPrincipal, @Param("id") id: string) {
    return this.notificationsService.markAsRead(id, user.userId);
  }
}
