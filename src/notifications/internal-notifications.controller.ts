import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { NotificationsService } from './notifications.service';

interface TriggerNotificationsBody {
  trigger: string;
  accountId?: string;
}

@Controller('internal/notifications')
@UseGuards(InternalApiKeyGuard)
export class InternalNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('trigger')
  async triggerNotificationGeneration(@Body() body: TriggerNotificationsBody) {
    if (!body?.trigger) {
      throw new BadRequestException('notifications.errors.triggerRequired');
    }

    let accountId: Types.ObjectId | undefined;
    if (body.accountId) {
      if (!Types.ObjectId.isValid(body.accountId)) {
        throw new BadRequestException('notifications.errors.invalidAccountId');
      }
      accountId = new Types.ObjectId(body.accountId);
    }

    return this.notificationsService.triggerNotificationGeneration(body.trigger, accountId);
  }
}
