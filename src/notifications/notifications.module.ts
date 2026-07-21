import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowUp, FollowUpSchema } from '../follow-ups/schemas/follow-up.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { WebsocketModule } from '../websocket/websocket.module';
import { InternalApiKeyGuard } from './guards/internal-api-key.guard';
import { InternalNotificationsController } from './internal-notifications.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationState, NotificationStateSchema } from './schemas/notification-state.schema';
import { Notification, NotificationSchema } from './schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FollowUp.name, schema: FollowUpSchema },
      { name: NotificationState.name, schema: NotificationStateSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema }
    ]),
    WebsocketModule
  ],
  controllers: [NotificationsController, InternalNotificationsController],
  providers: [NotificationsService, InternalApiKeyGuard],
  exports: [NotificationsService]
})
export class NotificationsModule {}
