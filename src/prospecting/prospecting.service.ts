import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { CreateProspectCallDto } from './dto/create-prospect-call.dto';
import { UpsertProspectBusinessDto } from './dto/upsert-prospect-business.dto';
import { ProspectBusiness, ProspectBusinessDocument } from './schemas/prospect-business.schema';
import { ProspectCallLog, ProspectCallLogDocument } from './schemas/prospect-call-log.schema';

const DEFAULT_COOLDOWN_DAYS = 7;
const NOT_INTERESTED_BLOCK_DAYS = 90;
const MAX_CALLS_IN_WINDOW = 3;
const MAX_CALLS_WINDOW_DAYS = 30;
const DAILY_REPORT_LIMIT = 14;
const WEEKLY_REPORT_LIMIT = 12;
const MONTHLY_REPORT_LIMIT = 12;

type ReportUnit = 'day' | 'week' | 'month';

export interface ProspectCallReportBucket {
  periodStart: Date;
  totalCalls: number;
  uniqueBusinesses: number;
}

export interface ProspectCallReportSummary extends Partial<ProspectCallReportBucket> {
  totalCalls: number;
  uniqueBusinesses: number;
}

export interface ProspectCallReportResponse {
  timezone: string;
  summary: {
    day: ProspectCallReportSummary;
    week: ProspectCallReportSummary;
    month: ProspectCallReportSummary;
  };
  daily: ProspectCallReportBucket[];
  weekly: ProspectCallReportBucket[];
  monthly: ProspectCallReportBucket[];
}

@Injectable()
export class ProspectingService {
  constructor(
    @InjectModel(ProspectBusiness.name) private readonly prospectBusinessModel: Model<ProspectBusinessDocument>,
    @InjectModel(ProspectCallLog.name) private readonly prospectCallLogModel: Model<ProspectCallLogDocument>
  ) {}

  async upsertBusiness(dto: UpsertProspectBusinessDto, accountId: Types.ObjectId, userId: string) {
    const now = new Date();
    const update: Partial<ProspectBusiness> = {
      name: dto.name,
      address: dto.address,
      phone: dto.phone,
      updatedBy: new Types.ObjectId(userId)
    };

    if (dto.lat !== undefined && dto.lng !== undefined) {
      update.location = { lat: dto.lat, lng: dto.lng };
    }

    const business = await this.prospectBusinessModel.findOneAndUpdate(
      { account: accountId, googlePlaceId: dto.googlePlaceId },
      {
        $set: update,
        $setOnInsert: {
          account: accountId,
          googlePlaceId: dto.googlePlaceId,
          createdBy: new Types.ObjectId(userId),
          createdAt: now
        }
      },
      { upsert: true, new: true }
    );

    return business;
  }

  async getBusinessStatusesByPlaceIds(placeIds: string[], accountId: Types.ObjectId) {
    if (!placeIds.length) {
      return [];
    }

    const businesses = await this.prospectBusinessModel
      .find({ account: accountId, googlePlaceId: { $in: placeIds } })
      .select('_id googlePlaceId lastCallAt nextAllowedCallAt doNotCallUntil')
      .lean();

    return businesses.map((business) => ({
      id: business._id,
      googlePlaceId: business.googlePlaceId,
      lastCallAt: business.lastCallAt,
      nextAllowedCallAt: business.nextAllowedCallAt,
      doNotCallUntil: business.doNotCallUntil
    }));
  }

  async getBusinessCallLogs(businessId: string, accountId: Types.ObjectId) {
    await this.ensureBusinessExists(businessId, accountId);

    return this.prospectCallLogModel
      .find({ account: accountId, prospectBusiness: new Types.ObjectId(businessId) })
      .sort({ calledAt: -1 })
      .populate('calledBy', 'firstName lastName email')
      .lean();
  }

  async getCallReport(accountId: Types.ObjectId, timezone?: string): Promise<ProspectCallReportResponse> {
    const resolvedTimezone = this.resolveTimezone(timezone);

    const [report] = await this.prospectCallLogModel.aggregate<{
      daily: ProspectCallReportBucket[];
      weekly: ProspectCallReportBucket[];
      monthly: ProspectCallReportBucket[];
      daySummary: ProspectCallReportSummary[];
      weekSummary: ProspectCallReportSummary[];
      monthSummary: ProspectCallReportSummary[];
    }>([
      { $match: { account: accountId } },
      {
        $facet: {
          daily: this.buildBucketPipeline('day', resolvedTimezone, DAILY_REPORT_LIMIT),
          weekly: this.buildBucketPipeline('week', resolvedTimezone, WEEKLY_REPORT_LIMIT),
          monthly: this.buildBucketPipeline('month', resolvedTimezone, MONTHLY_REPORT_LIMIT),
          daySummary: this.buildSummaryPipeline('day', resolvedTimezone),
          weekSummary: this.buildSummaryPipeline('week', resolvedTimezone),
          monthSummary: this.buildSummaryPipeline('month', resolvedTimezone)
        }
      }
    ]);

    return {
      timezone: resolvedTimezone,
      summary: {
        day: report?.daySummary?.[0] ?? { totalCalls: 0, uniqueBusinesses: 0 },
        week: report?.weekSummary?.[0] ?? { totalCalls: 0, uniqueBusinesses: 0 },
        month: report?.monthSummary?.[0] ?? { totalCalls: 0, uniqueBusinesses: 0 }
      },
      daily: report?.daily ?? [],
      weekly: report?.weekly ?? [],
      monthly: report?.monthly ?? []
    };
  }

  async createCallLog(businessId: string, dto: CreateProspectCallDto, accountId: Types.ObjectId, userId: string) {
    const business = await this.ensureBusinessExists(businessId, accountId);
    const now = new Date();

    if (business.doNotCallUntil && now < business.doNotCallUntil) {
      throw new BadRequestException('prospecting.errors.doNotCallActive');
    }

    if (business.nextAllowedCallAt && now < business.nextAllowedCallAt) {
      throw new BadRequestException('prospecting.errors.cooldownActive');
    }

    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - MAX_CALLS_WINDOW_DAYS);

    const recentCallCount = await this.prospectCallLogModel.countDocuments({
      account: accountId,
      prospectBusiness: business._id,
      calledAt: { $gte: windowStart }
    });

    if (recentCallCount >= MAX_CALLS_IN_WINDOW) {
      throw new BadRequestException('prospecting.errors.maxCallsWindowReached');
    }

    const callLog = await this.prospectCallLogModel.create({
      account: accountId,
      prospectBusiness: business._id,
      calledAt: now,
      calledBy: new Types.ObjectId(userId),
      outcome: dto.outcome,
      notes: dto.notes,
      callbackDate: dto.callbackDate ? new Date(dto.callbackDate) : undefined
    });

    const nextAllowedCallAt = new Date(now);
    nextAllowedCallAt.setDate(nextAllowedCallAt.getDate() + DEFAULT_COOLDOWN_DAYS);

    const businessUpdate: Partial<ProspectBusiness> = {
      lastCallAt: now,
      nextAllowedCallAt,
      updatedBy: new Types.ObjectId(userId)
    };

    if (dto.outcome === 'not_interested') {
      const doNotCallUntil = new Date(now);
      doNotCallUntil.setDate(doNotCallUntil.getDate() + NOT_INTERESTED_BLOCK_DAYS);
      businessUpdate.doNotCallUntil = doNotCallUntil;
    }

    await this.prospectBusinessModel.findByIdAndUpdate(business._id, { $set: businessUpdate }).exec();

    return callLog;
  }

  async deleteAllByAccount(accountId: Types.ObjectId) {
    await this.prospectCallLogModel.deleteMany({ account: accountId }).exec();
    return this.prospectBusinessModel.deleteMany({ account: accountId }).exec();
  }

  private async ensureBusinessExists(id: string, accountId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('prospecting.errors.businessNotFound');
    }

    const business = await this.prospectBusinessModel.findOne({ _id: new Types.ObjectId(id), account: accountId });

    if (!business) {
      throw new NotFoundException('prospecting.errors.businessNotFound');
    }

    return business;
  }

  private buildBucketPipeline(unit: ReportUnit, timezone: string, limit: number): PipelineStage.FacetPipelineStage[] {
    return [
      {
        $project: {
          periodStart: { $dateTrunc: { date: '$calledAt', unit, timezone } },
          prospectBusiness: 1
        }
      },
      {
        $group: {
          _id: '$periodStart',
          totalCalls: { $sum: 1 },
          uniqueBusinessesSet: { $addToSet: '$prospectBusiness' }
        }
      },
      {
        $project: {
          _id: 0,
          periodStart: '$_id',
          totalCalls: 1,
          uniqueBusinesses: { $size: '$uniqueBusinessesSet' }
        }
      },
      { $sort: { periodStart: -1 } },
      { $limit: limit }
    ];
  }

  private buildSummaryPipeline(unit: ReportUnit, timezone: string): PipelineStage.FacetPipelineStage[] {
    return [
      {
        $project: {
          periodStart: { $dateTrunc: { date: '$calledAt', unit, timezone } },
          currentPeriodStart: { $dateTrunc: { date: '$$NOW', unit, timezone } },
          prospectBusiness: 1
        }
      },
      {
        $match: {
          $expr: { $eq: ['$periodStart', '$currentPeriodStart'] }
        }
      },
      {
        $group: {
          _id: '$currentPeriodStart',
          totalCalls: { $sum: 1 },
          uniqueBusinessesSet: { $addToSet: '$prospectBusiness' }
        }
      },
      {
        $project: {
          _id: 0,
          periodStart: '$_id',
          totalCalls: 1,
          uniqueBusinesses: { $size: '$uniqueBusinessesSet' }
        }
      }
    ];
  }

  private resolveTimezone(timezone?: string) {
    if (!timezone) {
      return 'UTC';
    }

    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: timezone }).resolvedOptions().timeZone;
    } catch {
      throw new BadRequestException('prospecting.errors.invalidTimezone');
    }
  }
}
