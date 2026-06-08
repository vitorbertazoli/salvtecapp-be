import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FollowUpNotificationSummaryQueryDto } from './dto/follow-up-notification-summary-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('follow-ups/summary')
  @Roles('ADMIN', 'SUPERVISOR')
  async getFollowUpSummary(
    @Query() query: FollowUpNotificationSummaryQueryDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string
  ) {
    return this.notificationsService.getFollowUpAttentionSummary(accountId, userId, query.timezone);
  }

  @Post('follow-ups/seen')
  @Roles('ADMIN', 'SUPERVISOR')
  async markFollowUpSeen(@GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.notificationsService.markFollowUpAttentionSeen(accountId, userId);
  }
}
