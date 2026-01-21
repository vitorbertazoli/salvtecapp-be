import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { Technician, TechnicianDocument } from '../technicians/schemas/technician.schema';
import { Event, EventDocument } from './schemas/event.schema';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Technician.name) private technicianModel: Model<TechnicianDocument>,
    private serviceOrdersService: ServiceOrdersService
  ) {}

  async create(eventData: Partial<Event> & { customer: string; technician: string; serviceOrder?: string }, accountId: Types.ObjectId): Promise<Event> {
    // Fetch customer and technician to build title
    const customer = await this.customerModel.findById(eventData.customer);
    const technician = await this.technicianModel.findById(eventData.technician);

    if (!customer || !technician) {
      throw new Error('Invalid customer or technician');
    }

    // Build title
    const technicianUser = (technician as any).user;
    eventData.title = `${customer.name} - ${technicianUser?.firstName || ''} ${technicianUser?.lastName || ''}`.trim();

    const createdEvent = new this.eventModel({
      ...eventData,
      customer,
      technician
    });
    const savedEvent = await createdEvent.save();

    // Update service order status to 'scheduled' if a service order is linked
    if (eventData.serviceOrder) {
      await this.serviceOrdersService.updateByAccount(
        eventData.serviceOrder,
        {
          status: 'scheduled',
          scheduledDate: new Date(`${eventData.date}T${eventData.startTime}`)
        },
        accountId
      );
    }

    return savedEvent.toObject() as any;
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
    } else {
      // By default, exclude completed events from calendar view
      query.status = { $ne: 'completed' };
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
      .lean()
      .exec();
  }

  async updateByAccount(
    id: string,
    updateData: Partial<Event> & { customerId?: string; technicianId?: string; serviceOrderId?: string },
    accountId: Types.ObjectId
  ): Promise<Event | null> {
    const event = await this.eventModel.findOne({ _id: id, account: accountId });

    if (!event) {
      return null;
    }

    // Convert IDs to ObjectIds
    if (updateData.customerId) updateData.customer = new Types.ObjectId(updateData.customerId);
    if (updateData.technicianId) updateData.technician = new Types.ObjectId(updateData.technicianId);
    if (updateData.serviceOrderId) updateData.serviceOrder = new Types.ObjectId(updateData.serviceOrderId);

    // Update fields
    if (updateData.date) event.date = updateData.date;
    if (updateData.startTime) event.startTime = updateData.startTime;
    if (updateData.endTime) event.endTime = updateData.endTime;
    if (updateData.customer) event.customer = updateData.customer;
    if (updateData.technician) event.technician = updateData.technician;
    if (updateData.serviceOrder) event.serviceOrder = updateData.serviceOrder;
    if (updateData.status) event.status = updateData.status;
    if (updateData.completionNotes) event.completionNotes = updateData.completionNotes;
    if (updateData.updatedBy) event.updatedBy = updateData.updatedBy;

    // Handle status changes
    if (updateData.status === 'completed') {
      event.completedAt = new Date();
      event.completedBy = updateData.updatedBy;
      if (updateData.completionNotes) {
        event.completionNotes = updateData.completionNotes;
      }

      // Update service order status to completed if linked
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
    }

    // Update title if customer or technician changed
    if (updateData.customer || updateData.technician) {
      const customer = await this.customerModel.findById(updateData.customer || event.customer);
      const technician = await this.technicianModel.findById(updateData.technician || event.technician);

      if (customer && technician) {
        const technicianUser = (technician as any).user;
        event.title = `${customer.name} - ${technicianUser?.firstName || ''} ${technicianUser?.lastName || ''}`.trim();
      }
    }

    await event.save();

    // Update service order status to 'scheduled' if a service order is newly linked
    if (updateData.serviceOrder && updateData.serviceOrder.toString() !== event.serviceOrder?.toString()) {
      await this.serviceOrdersService.updateByAccount(
        updateData.serviceOrder.toString(),
        {
          status: 'scheduled',
          scheduledDate: new Date(`${event.date}T${event.startTime}`)
        },
        accountId
      );
    }

    return this.findByIdAndAccount(id, accountId);
  }

  async deleteByAccount(id: string, accountId: Types.ObjectId): Promise<boolean> {
    const result = await this.eventModel.findOneAndDelete({
      _id: id,
      account: accountId
    });

    return !!result;
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.eventModel.deleteMany({ account: accountId }).exec();
  }

  async completeByAccount(id: string, userId: Types.ObjectId, accountId: Types.ObjectId) {
    const event = await this.eventModel.findOne({ _id: id, account: accountId });

    if (!event) {
      throw new NotFoundException('Event not found');
    }
    event.status = 'completed';
    event.completedAt = new Date();
    event.completedBy = userId;

    await event.save();

    // Update linked service order if exists
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

    return this.findByIdAndAccount(id, accountId);
  }
}
