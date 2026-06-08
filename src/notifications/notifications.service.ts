import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowUp, FollowUpDocument } from '../follow-ups/schemas/follow-up.schema';
import { NotificationState, NotificationStateDocument } from './schemas/notification-state.schema';

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

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(FollowUp.name) private readonly followUpModel: Model<FollowUpDocument>,
    @InjectModel(NotificationState.name) private readonly notificationStateModel: Model<NotificationStateDocument>
  ) {}

  async getFollowUpAttentionSummary(
    accountId: Types.ObjectId,
    userId: string,
    timezone?: string
  ): Promise<FollowUpAttentionSummaryResponse> {
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
}
