import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowUp, FollowUpDocument } from '../follow-ups/schemas/follow-up.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AppGateway } from '../websocket/app.gateway';
import { NotificationState, NotificationStateDocument } from './schemas/notification-state.schema';
import { Notification, NotificationDocument, NotificationTargetType } from './schemas/notification.schema';

const FOLLOW_UP_ATTENTION_SCOPE = 'follow_up_attention';
const FOLLOW_UP_PREVIEW_LIMIT = 5;

interface FollowUpAttentionPreviewItem {
  _id: Types.ObjectId;
  customerId?: Types.ObjectId;
  customerName?: string;
  startDate: Date;
  isOverdue: boolean;
}

interface FollowUpAttentionCounts {
  totalAttention: number;
  overdueCount: number;
  dueTodayCount: number;
  unreadCount: number;
}

export interface FollowUpAttentionSummaryResponse {
  timezone: string;
  totalAttention: number;
  overdueCount: number;
  dueTodayCount: number;
  unreadCount: number;
  topItems: Array<{
    id: string;
    customerId?: string;
    customerName?: string;
    startDate: Date;
    isOverdue: boolean;
  }>;
}

export interface CreateNotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  url?: string;
  source?: string;
}

export interface NotificationCreationResponse {
  createdCount: number;
  recipientCount: number;
  notificationIds: string[];
}

interface TriggerNotificationGenerationResult {
  trigger: string;
  accountId?: string;
  message: string;
  triggeredAt: Date;
  createdCount: number;
  accountsProcessed: number;
  followUpsProcessed: number;
}

export interface UserNotificationsResponse {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    url?: string;
    source?: string;
    targetType: NotificationTargetType;
    targetRoles: string[];
    isRead: boolean;
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface NotificationLeanDocument extends Notification {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface FollowUpDueItem {
  _id: Types.ObjectId;
  account: Types.ObjectId;
  customer: Types.ObjectId | { _id: Types.ObjectId; name?: string };
  startDate: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(FollowUp.name) private readonly followUpModel: Model<FollowUpDocument>,
    @InjectModel(NotificationState.name) private readonly notificationStateModel: Model<NotificationStateDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    private readonly appGateway: AppGateway
  ) {}

  async createForUser(accountId: Types.ObjectId, recipientUserId: string, payload: CreateNotificationPayload): Promise<NotificationCreationResponse> {
    this.validatePayload(payload);

    if (!Types.ObjectId.isValid(recipientUserId)) {
      throw new BadRequestException('notifications.errors.invalidUserId');
    }

    const recipient = await this.userModel
      .findOne({
        _id: new Types.ObjectId(recipientUserId),
        account: accountId
      })
      .select('_id')
      .lean();

    if (!recipient) {
      throw new NotFoundException('notifications.errors.userNotFound');
    }

    const createdNotifications = await this.createNotificationsForRecipients(accountId, [recipient._id], 'USER', [], payload);

    this.appGateway.broadcastToUser(accountId.toString(), recipient._id.toString(), 'notification.created', {
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      url: payload.url,
      source: payload.source
    });

    return {
      createdCount: createdNotifications.length,
      recipientCount: 1,
      notificationIds: createdNotifications.map((notification) => notification._id.toString())
    };
  }

  async createForRole(accountId: Types.ObjectId, roleName: string, payload: CreateNotificationPayload): Promise<NotificationCreationResponse> {
    this.validatePayload(payload);

    const normalizedRoleName = roleName?.trim();
    if (!normalizedRoleName) {
      throw new BadRequestException('notifications.errors.roleRequired');
    }

    const role = await this.roleModel.findOne({ name: normalizedRoleName }).select('_id name').lean();

    if (!role) {
      throw new NotFoundException('notifications.errors.roleNotFound');
    }

    const recipients = await this.userModel.find({ account: accountId, roles: role._id }).select('_id').lean();

    const recipientIds = recipients.map((recipient) => recipient._id);
    const createdNotifications = await this.createNotificationsForRecipients(accountId, recipientIds, 'ROLE', [role.name], payload);

    if (createdNotifications.length > 0) {
      this.appGateway.broadcastToRole(accountId.toString(), role.name, 'notification.created', {
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        url: payload.url,
        source: payload.source
      });
    }

    return {
      createdCount: createdNotifications.length,
      recipientCount: recipientIds.length,
      notificationIds: createdNotifications.map((notification) => notification._id.toString())
    };
  }

  async createForAccount(accountId: Types.ObjectId, payload: CreateNotificationPayload): Promise<NotificationCreationResponse> {
    this.validatePayload(payload);

    const recipients = await this.userModel.find({ account: accountId }).select('_id').lean();

    const recipientIds = recipients.map((recipient) => recipient._id);
    const createdNotifications = await this.createNotificationsForRecipients(accountId, recipientIds, 'ACCOUNT', [], payload);

    if (createdNotifications.length > 0) {
      this.appGateway.broadcastToAccount(accountId.toString(), 'notification.created', {
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        url: payload.url,
        source: payload.source
      });
    }

    return {
      createdCount: createdNotifications.length,
      recipientCount: recipientIds.length,
      notificationIds: createdNotifications.map((notification) => notification._id.toString())
    };
  }

  async listForUser(
    accountId: Types.ObjectId,
    userId: string,
    page: string = '1',
    limit: string = '20',
    unreadOnly: boolean = false
  ): Promise<UserNotificationsResponse> {
    const userObjectId = this.parseUserId(userId);
    const parsedPage = this.parsePositiveInt(page, 1);
    const parsedLimit = this.parsePositiveInt(limit, 20);
    const resolvedLimit = Math.min(parsedLimit, 100);
    const skip = (parsedPage - 1) * resolvedLimit;

    const query: Record<string, unknown> = {
      account: accountId,
      recipientUser: userObjectId
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(resolvedLimit).lean<NotificationLeanDocument[]>(),
      this.notificationModel.countDocuments(query),
      this.notificationModel.countDocuments({
        account: accountId,
        recipientUser: userObjectId,
        isRead: false
      })
    ]);

    return {
      notifications: notifications.map((notification) => this.mapNotification(notification)),
      total,
      unreadCount,
      page: parsedPage,
      limit: resolvedLimit,
      totalPages: Math.ceil(total / resolvedLimit) || 1
    };
  }

  async markAsRead(accountId: Types.ObjectId, userId: string, notificationId: string) {
    const userObjectId = this.parseUserId(userId);

    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('notifications.errors.invalidNotificationId');
    }

    const updatedNotification = await this.notificationModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(notificationId),
          account: accountId,
          recipientUser: userObjectId
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        },
        { new: true }
      )
      .lean<NotificationLeanDocument | null>();

    if (!updatedNotification) {
      throw new NotFoundException('notifications.errors.notificationNotFound');
    }

    return this.mapNotification(updatedNotification);
  }

  async markAllAsRead(accountId: Types.ObjectId, userId: string) {
    const userObjectId = this.parseUserId(userId);
    const readAt = new Date();

    const result = await this.notificationModel.updateMany(
      {
        account: accountId,
        recipientUser: userObjectId,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt
        }
      }
    );

    return {
      updatedCount: result.modifiedCount,
      readAt
    };
  }

  async triggerNotificationGeneration(trigger: string, accountId?: Types.ObjectId) {
    this.logger.log(`Notification generation trigger received: ${trigger}${accountId ? ` (account: ${accountId.toString()})` : ''}`);

    if (trigger !== 'all' && trigger !== 'follow_up_attention') {
      throw new BadRequestException('notifications.errors.invalidTrigger');
    }

    const result = await this.generateFollowUpAttentionNotifications(accountId);

    return {
      trigger,
      accountId: accountId?.toString(),
      message: 'Notification generation completed',
      triggeredAt: new Date(),
      createdCount: result.createdCount,
      accountsProcessed: result.accountsProcessed,
      followUpsProcessed: result.followUpsProcessed
    } satisfies TriggerNotificationGenerationResult;
  }

  async getFollowUpAttentionSummary(accountId: Types.ObjectId, userId: string, timezone?: string): Promise<FollowUpAttentionSummaryResponse> {
    const resolvedTimezone = this.resolveTimezone(timezone);
    const userObjectId = new Types.ObjectId(userId);

    const state = await this.notificationStateModel
      .findOne({
        account: accountId,
        user: userObjectId,
        scope: FOLLOW_UP_ATTENTION_SCOPE
      })
      .select('seenAt')
      .lean();

    const seenAt = state?.seenAt;

    const [result] = await this.followUpModel.aggregate<{
      counts: FollowUpAttentionCounts[];
      topItems: FollowUpAttentionPreviewItem[];
    }>([
      {
        $match: {
          account: accountId,
          status: 'pending',
          startDate: { $lte: new Date() }
        }
      },
      {
        $addFields: {
          currentDayStart: { $dateTrunc: { date: '$$NOW', unit: 'day', timezone: resolvedTimezone } },
          startDayStart: { $dateTrunc: { date: '$startDate', unit: 'day', timezone: resolvedTimezone } }
        }
      },
      {
        $addFields: {
          isDueToday: { $eq: ['$startDayStart', '$currentDayStart'] },
          isOverdue: { $lt: ['$startDayStart', '$currentDayStart'] },
          isUnread: seenAt
            ? {
                $or: [{ $gt: ['$startDate', seenAt] }, { $gt: ['$updatedAt', seenAt] }]
              }
            : true
        }
      },
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                totalAttention: { $sum: 1 },
                overdueCount: { $sum: { $cond: ['$isOverdue', 1, 0] } },
                dueTodayCount: { $sum: { $cond: ['$isDueToday', 1, 0] } },
                unreadCount: { $sum: { $cond: ['$isUnread', 1, 0] } }
              }
            },
            {
              $project: {
                _id: 0,
                totalAttention: 1,
                overdueCount: 1,
                dueTodayCount: 1,
                unreadCount: 1
              }
            }
          ],
          topItems: [
            { $sort: { startDate: 1, createdAt: -1 } },
            { $limit: FOLLOW_UP_PREVIEW_LIMIT },
            {
              $lookup: {
                from: 'customers',
                localField: 'customer',
                foreignField: '_id',
                as: 'customer'
              }
            },
            { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                customerId: '$customer._id',
                customerName: '$customer.name',
                startDate: 1,
                isOverdue: 1
              }
            }
          ]
        }
      }
    ]);

    const counts = result?.counts?.[0] ?? {
      totalAttention: 0,
      overdueCount: 0,
      dueTodayCount: 0,
      unreadCount: 0
    };

    const topItems = (result?.topItems ?? []).map((item) => ({
      id: item._id.toString(),
      customerId: item.customerId?.toString(),
      customerName: item.customerName,
      startDate: item.startDate,
      isOverdue: item.isOverdue
    }));

    return {
      timezone: resolvedTimezone,
      totalAttention: counts.totalAttention,
      overdueCount: counts.overdueCount,
      dueTodayCount: counts.dueTodayCount,
      unreadCount: counts.unreadCount,
      topItems
    };
  }

  async markFollowUpAttentionSeen(accountId: Types.ObjectId, userId: string) {
    const seenAt = new Date();

    await this.notificationStateModel.findOneAndUpdate(
      {
        account: accountId,
        user: new Types.ObjectId(userId),
        scope: FOLLOW_UP_ATTENTION_SCOPE
      },
      {
        $set: { seenAt }
      },
      {
        new: true,
        upsert: true
      }
    );

    return { seenAt };
  }

  private resolveTimezone(timezone?: string): string {
    if (!timezone) {
      return 'UTC';
    }

    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: timezone }).resolvedOptions().timeZone;
    } catch {
      throw new BadRequestException('notifications.errors.invalidTimezone');
    }
  }

  private async createNotificationsForRecipients(
    accountId: Types.ObjectId,
    recipientIds: Types.ObjectId[],
    targetType: NotificationTargetType,
    targetRoles: string[],
    payload: CreateNotificationPayload
  ): Promise<NotificationDocument[]> {
    const uniqueRecipientIds = Array.from(new Set(recipientIds.map((recipientId) => recipientId.toString()))).map((id) => new Types.ObjectId(id));

    if (uniqueRecipientIds.length === 0) {
      return [];
    }

    let recipientsToNotify = uniqueRecipientIds;

    // Prevent duplicate generation when the same source is reprocessed (cron retries/re-runs).
    if (payload.source) {
      const existing = await this.notificationModel
        .find({
          account: accountId,
          source: payload.source,
          recipientUser: { $in: uniqueRecipientIds }
        })
        .select('recipientUser')
        .lean();

      const alreadyNotified = new Set(existing.map((item) => item.recipientUser.toString()));
      recipientsToNotify = uniqueRecipientIds.filter((id) => !alreadyNotified.has(id.toString()));
    }

    if (recipientsToNotify.length === 0) {
      return [];
    }

    const now = new Date();

    const notifications = recipientsToNotify.map((recipientUser) => ({
      account: accountId,
      recipientUser,
      targetType,
      targetRoles,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      url: payload.url,
      source: payload.source,
      isRead: false,
      createdAt: now,
      updatedAt: now
    }));

    return this.notificationModel.insertMany(notifications);
  }

  private async generateFollowUpAttentionNotifications(
    accountId?: Types.ObjectId
  ): Promise<{ createdCount: number; accountsProcessed: number; followUpsProcessed: number }> {
    const match: Record<string, unknown> = {
      status: 'pending',
      startDate: { $lte: new Date() }
    };

    if (accountId) {
      match.account = accountId;
    }

    const overdueFollowUps = await this.followUpModel
      .find(match)
      .select('_id account customer startDate')
      .populate('customer', 'name')
      .lean<FollowUpDueItem[]>();

    if (overdueFollowUps.length === 0) {
      return {
        createdCount: 0,
        accountsProcessed: accountId ? 1 : 0,
        followUpsProcessed: 0
      };
    }

    const groupedByAccount = overdueFollowUps.reduce<Map<string, FollowUpDueItem[]>>((acc, followUp) => {
      const key = followUp.account.toString();
      const list = acc.get(key) || [];
      list.push(followUp);
      acc.set(key, list);
      return acc;
    }, new Map());

    let createdCount = 0;

    for (const [accountKey, accountFollowUps] of groupedByAccount.entries()) {
      const accountObjectId = new Types.ObjectId(accountKey);

      const [adminRole, supervisorRole] = await Promise.all([
        this.roleModel.findOne({ name: 'ADMIN' }).select('_id').lean(),
        this.roleModel.findOne({ name: 'SUPERVISOR' }).select('_id').lean()
      ]);

      const roleIds = [adminRole?._id, supervisorRole?._id].filter((id): id is Types.ObjectId => Boolean(id));
      if (roleIds.length === 0) {
        continue;
      }

      const recipients = await this.userModel
        .find({ account: accountObjectId, roles: { $in: roleIds } })
        .select('_id')
        .lean();
      const recipientIds = recipients.map((recipient) => recipient._id);

      if (recipientIds.length === 0) {
        continue;
      }

      for (const followUp of accountFollowUps) {
        const customerId = this.getCustomerId(followUp.customer);
        const customerName = this.getCustomerName(followUp.customer);

        const creation = await this.createNotificationsForRecipients(accountObjectId, recipientIds, 'ROLE', ['ADMIN', 'SUPERVISOR'], {
          type: 'FOLLOW_UP_ATTENTION',
          title: 'notifications.followUpAttention.title',
          message: 'notifications.followUpAttention.message',
          data: {
            followUpId: followUp._id.toString(),
            customerId,
            customerName,
            startDate: followUp.startDate,
            accountId: accountKey
          },
          url: '/follow-ups',
          source: `follow_up_attention:${followUp._id.toString()}`
        });

        if (creation.length > 0) {
          createdCount += creation.length;
        }
      }

      this.appGateway.broadcastToRoles(accountKey, ['ADMIN', 'SUPERVISOR'], 'notification.created', {
        type: 'FOLLOW_UP_ATTENTION',
        title: 'Follow-up requires attention',
        message: 'New overdue follow-up notifications are available'
      });
    }

    return {
      createdCount,
      accountsProcessed: groupedByAccount.size,
      followUpsProcessed: overdueFollowUps.length
    };
  }

  private parseUserId(userId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('notifications.errors.invalidUserId');
    }

    return new Types.ObjectId(userId);
  }

  private parsePositiveInt(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private validatePayload(payload: CreateNotificationPayload): void {
    if (!payload?.type?.trim()) {
      throw new BadRequestException('notifications.errors.typeRequired');
    }

    if (!payload?.title?.trim()) {
      throw new BadRequestException('notifications.errors.titleRequired');
    }

    if (!payload?.message?.trim()) {
      throw new BadRequestException('notifications.errors.messageRequired');
    }

    if (payload.url !== undefined) {
      const normalizedUrl = payload.url.trim();
      if (!normalizedUrl.startsWith('/')) {
        throw new BadRequestException('notifications.errors.invalidUrl');
      }
      payload.url = normalizedUrl;
    }
  }

  private mapNotification(notification: NotificationLeanDocument) {
    return {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      url: notification.url,
      source: notification.source,
      targetType: notification.targetType,
      targetRoles: notification.targetRoles || [],
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt
    };
  }

  private getCustomerId(customer: FollowUpDueItem['customer']): string {
    if (customer instanceof Types.ObjectId) {
      return customer.toString();
    }

    return customer._id.toString();
  }

  private getCustomerName(customer: FollowUpDueItem['customer']): string {
    if (customer instanceof Types.ObjectId) {
      return 'customer';
    }

    return customer.name?.trim() || 'customer';
  }
}
