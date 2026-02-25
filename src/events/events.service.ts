import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { Technician, TechnicianDocument } from '../technicians/schemas/technician.schema';
import { UpdateRecurringConfigDto } from './dto/recurring-config.dto';
import { Event, EventDocument } from './schemas/event.schema';
import { RecurringEventConfig, RecurringEventConfigDocument } from './schemas/recurring-event-config.schema';

type UpdateScope = 'single' | 'future' | 'all';

type RecurrenceCreateData = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  daysOfWeek?: number[];
  untilDate: string;
};

type EventCreateData = Partial<Event> & {
  customer: Types.ObjectId;
  technician: Types.ObjectId[];
  serviceOrder?: Types.ObjectId;
  recurringConfig?: RecurrenceCreateData;
};

type EventUpdateData = Partial<Event> & {
  customerId?: string;
  serviceOrderId?: string;
  recurringUpdate?: {
    scope?: UpdateScope;
    recurringConfig?: UpdateRecurringConfigDto;
  };
};

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(RecurringEventConfig.name) private recurringConfigModel: Model<RecurringEventConfigDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Technician.name) private technicianModel: Model<TechnicianDocument>,
    private serviceOrdersService: ServiceOrdersService
  ) {}

  private toUtcDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private formatUtcDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private validateRecurringDateRange(startDate: string, untilDate: string): void {
    const start = this.toUtcDate(startDate);
    const end = this.toUtcDate(untilDate);

    if (end < start) {
      throw new BadRequestException('events.errors.invalidRecurringDateRange');
    }

    // Ensure untilDate is not more than 1 year from startDate
    const oneYearLater = new Date(start);
    oneYearLater.setUTCFullYear(oneYearLater.getUTCFullYear() + 1);

    if (end > oneYearLater) {
      throw new BadRequestException('events.errors.recurringMaxOneYear');
    }
  }

  private generateOccurrenceDates(
    startDate: string,
    untilDate: string,
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
    interval: number,
    daysOfWeek?: number[]
  ): string[] {
    this.validateRecurringDateRange(startDate, untilDate);

    const start = this.toUtcDate(startDate);
    const end = this.toUtcDate(untilDate);

    const dates: string[] = [];
    const safeInterval = interval > 0 ? interval : 1;

    // Weekly with specific days of week
    if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
      // Start from the beginning of the week containing the start date (Sunday = 0)
      const weekStart = new Date(start);
      const startDayOfWeek = weekStart.getUTCDay();
      weekStart.setUTCDate(weekStart.getUTCDate() - startDayOfWeek);

      let weekNumber = 0;
      while (true) {
        // Calculate the start of the current occurrence week
        const currentWeekStart = new Date(weekStart);
        currentWeekStart.setUTCDate(weekStart.getUTCDate() + weekNumber * safeInterval * 7);

        if (currentWeekStart > end) break;

        // Generate events for each specified day of the week
        for (const dayOfWeek of daysOfWeek) {
          const eventDate = new Date(currentWeekStart);
          eventDate.setUTCDate(currentWeekStart.getUTCDate() + dayOfWeek);

          // Only include if within our date range
          if (eventDate >= start && eventDate <= end) {
            dates.push(this.formatUtcDate(eventDate));

            if (dates.length > 400) {
              throw new BadRequestException('events.errors.recurringLimitExceeded');
            }
          }
        }

        weekNumber++;
      }

      return dates;
    }

    // Standard recurrence (daily, weekly without specific days, monthly, yearly)
    const cursor = new Date(start);
    while (cursor <= end) {
      dates.push(this.formatUtcDate(cursor));

      if (dates.length > 400) {
        throw new BadRequestException('events.errors.recurringLimitExceeded');
      }

      if (frequency === 'daily') {
        cursor.setUTCDate(cursor.getUTCDate() + safeInterval);
      } else if (frequency === 'weekly') {
        cursor.setUTCDate(cursor.getUTCDate() + safeInterval * 7);
      } else if (frequency === 'monthly') {
        cursor.setUTCMonth(cursor.getUTCMonth() + safeInterval);
      } else if (frequency === 'yearly') {
        cursor.setUTCFullYear(cursor.getUTCFullYear() + safeInterval);
      }
    }

    return dates;
  }

  private async buildEventTitle(customerId: Types.ObjectId, technicianIds: Types.ObjectId[]): Promise<string> {
    const customer = await this.customerModel.findById(customerId);
    const technicians = await this.technicianModel.find({ _id: { $in: technicianIds } }).populate('user', 'firstName lastName');

    if (!customer || technicians.length !== technicianIds.length) {
      throw new BadRequestException('events.errors.invalidCustomerOrTechnician');
    }

    const firstTechnician = technicians[0] as any;
    const technicianUser = firstTechnician?.user;
    return `${customer.name} - ${technicianUser?.firstName || ''} ${technicianUser?.lastName || ''}`.trim();
  }

  private async updateServiceOrderToScheduled(serviceOrderId: Types.ObjectId, date: string, startTime: string, accountId: Types.ObjectId): Promise<void> {
    await this.serviceOrdersService.updateByAccount(
      serviceOrderId.toString(),
      {
        status: 'scheduled',
        scheduledDate: new Date(`${date}T${startTime}`)
      },
      accountId
    );
  }

  private async applyRecurringConfigUpdates(
    recurringConfigId: Types.ObjectId,
    accountId: Types.ObjectId,
    updates: UpdateRecurringConfigDto,
    fallbackDate: string,
    userId?: Types.ObjectId
  ): Promise<RecurringEventConfigDocument | null> {
    if (!updates || Object.keys(updates).length === 0) {
      return null;
    }

    const config = await this.recurringConfigModel.findOne({ _id: recurringConfigId, account: accountId });
    if (!config) {
      return null;
    }

    if (updates.frequency) config.frequency = updates.frequency;
    if (updates.interval) config.interval = updates.interval;
    if (updates.untilDate) config.untilDate = updates.untilDate;
    if (updates.daysOfWeek !== undefined) config.daysOfWeek = updates.daysOfWeek;
    if (!config.startDate) config.startDate = fallbackDate;
    if (userId) config.updatedBy = userId;

    await config.save();
    return config;
  }

  private async recalculateRecurringEvents(
    recurringConfigId: Types.ObjectId,
    config: RecurringEventConfigDocument,
    accountId: Types.ObjectId,
    referenceEvent: EventDocument,
    scope: UpdateScope,
    updateData: EventUpdateData
  ): Promise<void> {
    // Calculate what dates SHOULD exist based on the updated config
    const startDate = scope === 'future' ? referenceEvent.date : config.startDate;
    const newOccurrenceDates = this.generateOccurrenceDates(startDate, config.untilDate, config.frequency, config.interval, config.daysOfWeek);

    // Get existing events based on scope
    const query: any = {
      account: accountId,
      recurringConfig: recurringConfigId
    };

    if (scope === 'future') {
      query.date = { $gte: referenceEvent.date };
    }

    const existingEvents = await this.eventModel.find(query).sort({ date: 1 });
    const existingEventsByDate = new Map<string, EventDocument>();
    existingEvents.forEach((evt) => existingEventsByDate.set(evt.date, evt));

    const newOccurrenceDatesSet = new Set(newOccurrenceDates);

    // Delete events that shouldn't exist anymore
    const eventsToDelete = existingEvents.filter((evt) => !newOccurrenceDatesSet.has(evt.date));
    const deletePromises = eventsToDelete.map((evt) => this.eventModel.deleteOne({ _id: evt._id }));
    await Promise.all(deletePromises);

    // Create events for new dates that don't exist
    const datesToCreate = newOccurrenceDates.filter((date) => !existingEventsByDate.has(date));
    const eventsToCreate = datesToCreate.map((date) => ({
      date,
      startTime: referenceEvent.startTime,
      endTime: referenceEvent.endTime,
      customer: referenceEvent.customer,
      technician: referenceEvent.technician,
      account: accountId,
      title: referenceEvent.title,
      description: referenceEvent.description,
      status: 'scheduled' as const,
      serviceOrder: referenceEvent.serviceOrder,
      recurringConfig: recurringConfigId,
      createdBy: updateData.updatedBy || referenceEvent.createdBy,
      updatedBy: updateData.updatedBy || referenceEvent.updatedBy
    }));

    if (eventsToCreate.length > 0) {
      await this.eventModel.insertMany(eventsToCreate);
    }
  }

  private async updateSingleEventDocument(
    event: EventDocument,
    updateData: EventUpdateData,
    accountId: Types.ObjectId,
    allowDateUpdate: boolean
  ): Promise<void> {
    const previousServiceOrder = event.serviceOrder?.toString();

    if (updateData.customerId) updateData.customer = new Types.ObjectId(updateData.customerId);
    if (updateData.serviceOrderId) updateData.serviceOrder = new Types.ObjectId(updateData.serviceOrderId);

    if (allowDateUpdate && updateData.date) event.date = updateData.date;
    if (updateData.startTime) event.startTime = updateData.startTime;
    if (updateData.endTime) event.endTime = updateData.endTime;
    if (updateData.customer) event.customer = updateData.customer;
    if (updateData.technician) event.technician = updateData.technician;
    if (updateData.serviceOrder !== undefined) event.serviceOrder = updateData.serviceOrder;
    if (updateData.status) event.status = updateData.status;
    if (updateData.completionNotes !== undefined) event.completionNotes = updateData.completionNotes;
    if (updateData.updatedBy) event.updatedBy = updateData.updatedBy;

    if (updateData.status === 'completed') {
      event.completedAt = new Date();
      event.completedBy = updateData.updatedBy;

      if (event.serviceOrder) {
        await this.serviceOrdersService.updateByAccount(
          event.serviceOrder.toString(),
          {
            status: 'completed',
            completedAt: new Date()
          },
          accountId
        );
      }
    } else if (updateData.status === 'scheduled' && event.serviceOrder) {
      await this.updateServiceOrderToScheduled(event.serviceOrder, event.date, event.startTime, accountId);
    }

    if (updateData.customer || updateData.technician) {
      event.title = await this.buildEventTitle(event.customer, event.technician);
    }

    await event.save();

    if (updateData.serviceOrder && updateData.serviceOrder.toString() !== previousServiceOrder) {
      await this.updateServiceOrderToScheduled(updateData.serviceOrder, event.date, event.startTime, accountId);
    }
  }

  async create(eventData: EventCreateData, accountId: Types.ObjectId): Promise<Event> {
    eventData.title = await this.buildEventTitle(eventData.customer, eventData.technician);

    if (!eventData.recurringConfig) {
      const createdEvent = new this.eventModel({
        ...eventData,
        technician: eventData.technician
      });
      const savedEvent = await createdEvent.save();

      if (eventData.serviceOrder) {
        await this.updateServiceOrderToScheduled(eventData.serviceOrder, eventData.date!, eventData.startTime!, accountId);
      }

      return savedEvent.toObject() as any;
    }

    const recurringConfigDoc = await this.recurringConfigModel.create({
      account: accountId,
      frequency: eventData.recurringConfig.frequency,
      interval: eventData.recurringConfig.interval || 1,
      daysOfWeek: eventData.recurringConfig.daysOfWeek || [],
      startDate: eventData.date,
      untilDate: eventData.recurringConfig.untilDate,
      createdBy: eventData.createdBy,
      updatedBy: eventData.updatedBy
    });

    const occurrenceDates = this.generateOccurrenceDates(
      eventData.date!,
      eventData.recurringConfig.untilDate,
      eventData.recurringConfig.frequency,
      eventData.recurringConfig.interval || 1,
      eventData.recurringConfig.daysOfWeek
    );

    const docsToInsert = occurrenceDates.map((occurrenceDate) => ({
      ...eventData,
      date: occurrenceDate,
      recurringConfig: recurringConfigDoc._id
    }));

    const savedEvents = await this.eventModel.insertMany(docsToInsert);

    if (eventData.serviceOrder) {
      await this.updateServiceOrderToScheduled(eventData.serviceOrder, eventData.date!, eventData.startTime!, accountId);
    }

    return savedEvents[0].toObject() as any;
  }

  async findAll(
    accountId: Types.ObjectId,
    filters?: {
      startDate?: string;
      endDate?: string;
      technicianId?: string;
      customerId?: string;
      status?: string;
    }
  ): Promise<Event[]> {
    const query: any = { account: accountId };

    if (filters?.startDate && filters?.endDate) {
      query.date = {
        $gte: filters.startDate,
        $lte: filters.endDate
      };
    }

    if (filters?.technicianId) {
      query.technician = new Types.ObjectId(filters.technicianId);
    }

    if (filters?.customerId) {
      query.customer = new Types.ObjectId(filters.customerId);
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    return this.eventModel
      .find(query)
      .populate('customer', 'name email phoneNumbers address')
      .populate({
        path: 'technician',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .populate('serviceOrder', 'orderNumber status')
      .populate('recurringConfig')
      .sort({ date: 1, startTime: 1 })
      .lean()
      .exec();
  }

  async findAllPaginated(
    accountId: Types.ObjectId,
    page: string,
    limit?: string,
    customerId?: string
  ): Promise<{
    events: Event[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit || '10', 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = { account: accountId };

    if (customerId) {
      query.customer = new Types.ObjectId(customerId);
    }

    const [events, total] = await Promise.all([
      this.eventModel
        .find(query)
        .populate('customer', 'name email phoneNumbers address')
        .populate({
          path: 'technician',
          populate: {
            path: 'user',
            select: 'firstName lastName email'
          }
        })
        .populate('serviceOrder', 'orderNumber status')
        .populate('recurringConfig')
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
      this.eventModel.countDocuments(query)
    ]);

    return {
      events,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    };
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<Event | null> {
    return this.eventModel
      .findOne({ _id: id, account: accountId })
      .populate('customer', 'name email phone')
      .populate({
        path: 'technician',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .populate('serviceOrder')
      .populate('recurringConfig')
      .lean()
      .exec();
  }

  async updateByAccount(id: string, updateData: EventUpdateData, accountId: Types.ObjectId): Promise<any> {
    const event = await this.eventModel.findOne({ _id: id, account: accountId });

    if (!event) {
      return null;
    }

    const scope: UpdateScope = updateData.recurringUpdate?.scope || 'single';
    const recurringConfigId = event.recurringConfig;
    const canApplySeriesUpdate = !!recurringConfigId && scope !== 'single';

    if (!canApplySeriesUpdate) {
      await this.updateSingleEventDocument(event, updateData, accountId, true);
      return this.findByIdAndAccount(id, accountId);
    }

    // Check if recurring config itself is being updated
    const hasRecurringConfigChanges = updateData.recurringUpdate?.recurringConfig && Object.keys(updateData.recurringUpdate.recurringConfig).length > 0;

    const updatedConfig = await this.applyRecurringConfigUpdates(
      recurringConfigId,
      accountId,
      updateData.recurringUpdate?.recurringConfig || {},
      event.date,
      updateData.updatedBy
    );

    // If recurring config changed (frequency, interval, or untilDate), recalculate events
    if (hasRecurringConfigChanges && updatedConfig) {
      await this.recalculateRecurringEvents(recurringConfigId, updatedConfig, accountId, event, scope, updateData);
    }

    // Get all current events (after recalculation) and apply updates
    const query: any = {
      account: accountId,
      recurringConfig: recurringConfigId
    };

    if (scope === 'future') {
      query.date = { $gte: event.date };
    }

    const targetEvents = await this.eventModel.find(query).sort({ date: 1, startTime: 1 });

    for (const targetEvent of targetEvents) {
      await this.updateSingleEventDocument(targetEvent, updateData, accountId, false);
    }

    const updatedEvent = await this.findByIdAndAccount(id, accountId);
    return {
      ...(updatedEvent || {}),
      updatedCount: targetEvents.length,
      scope
    };
  }

  async deleteByAccount(
    id: string,
    accountId: Types.ObjectId,
    scope: 'single' | 'future' | 'all' = 'single'
  ): Promise<{ deleted: boolean; deletedCount?: number }> {
    const event = await this.eventModel.findOne({ _id: id, account: accountId });

    if (!event) {
      return { deleted: false };
    }

    // If not recurring or scope is single, delete only this event
    if (!event.recurringConfig || scope === 'single') {
      // If there's a linked service order with status 'scheduled', change it back to 'pending'
      if (event.serviceOrder) {
        const serviceOrder = await this.serviceOrdersService.findByIdAndAccount(event.serviceOrder.toString(), accountId);
        if (serviceOrder && serviceOrder.status === 'scheduled') {
          await this.serviceOrdersService.updateByAccount(event.serviceOrder.toString(), { status: 'pending' }, accountId);
        }
      }

      await this.eventModel.findOneAndDelete({ _id: id, account: accountId });
      return { deleted: true, deletedCount: 1 };
    }

    // Handle recurring event deletion with scope
    const query: any = {
      account: accountId,
      recurringConfig: event.recurringConfig
    };

    if (scope === 'future') {
      query.date = { $gte: event.date };
    }
    // scope === 'all' deletes all events in the series (no additional filter needed)

    const eventsToDelete = await this.eventModel.find(query);

    // Update service orders status for all events that will be deleted
    for (const evt of eventsToDelete) {
      if (evt.serviceOrder) {
        const serviceOrder = await this.serviceOrdersService.findByIdAndAccount(evt.serviceOrder.toString(), accountId);
        if (serviceOrder && serviceOrder.status === 'scheduled') {
          await this.serviceOrdersService.updateByAccount(evt.serviceOrder.toString(), { status: 'pending' }, accountId);
        }
      }
    }

    const deleteResult = await this.eventModel.deleteMany(query);

    // If deleting all, also delete the recurring config
    if (scope === 'all') {
      await this.recurringConfigModel.findOneAndDelete({ _id: event.recurringConfig, account: accountId });
    }

    return { deleted: true, deletedCount: deleteResult.deletedCount };
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    await this.eventModel.deleteMany({ account: accountId }).exec();
    return this.recurringConfigModel.deleteMany({ account: accountId }).exec();
  }

  async completeByAccount(id: string, userId: Types.ObjectId, accountId: Types.ObjectId, notes?: string, completeServiceOrder?: boolean) {
    const event = await this.eventModel.findOne({ _id: id, account: accountId });

    if (!event) {
      throw new NotFoundException('events.errors.eventNotFound');
    }
    event.status = 'completed';
    event.completedAt = new Date();
    event.completedBy = userId;

    if (notes) {
      event.completionNotes = notes;
    }

    await event.save();

    // Update linked service order if exists and completeServiceOrder is true
    if (event.serviceOrder && completeServiceOrder) {
      await this.serviceOrdersService.updateByAccount(
        event.serviceOrder.toString(),
        {
          status: 'completed',
          completedAt: new Date()
        },
        accountId
      );
    }

    return this.findByIdAndAccount(id, accountId);
  }
}
