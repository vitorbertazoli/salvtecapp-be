import { Injectable } from '@nestjs/common';
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

  async create(eventData: Partial<Event> & { customerId: string; technicianId: string; serviceOrderId?: string }): Promise<Event> {
    // Fetch customer and technician to build title
    const customer = await this.customerModel.findById(new Types.ObjectId(eventData.customerId));
    const technician = await this.technicianModel.findById(new Types.ObjectId(eventData.technicianId));

    if (!customer || !technician) {
      throw new Error('Invalid customer or technician');
    }

    // Build title
    eventData.title = `${customer.name} - ${technician.name}`;

    if (eventData.serviceOrderId) {
      eventData.serviceOrder = new Types.ObjectId(eventData.serviceOrderId);
    }

    const createdEvent = new this.eventModel({
      ...eventData,
      customer,
      technician
    });
    const savedEvent = await createdEvent.save();

    // Update service order status to 'scheduled' if a service order is linked
    if (eventData.serviceOrderId) {
      await this.serviceOrdersService.updateByAccount(
        eventData.serviceOrderId,
        {
          status: 'scheduled',
          scheduledDate: new Date(`${eventData.date}T${eventData.startTime}`)
        },
        eventData.account!.toString()
      );
    }

    return savedEvent.toObject() as any;
  }

  async findAll(
    accountId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      technicianId?: string;
      customerId?: string;
      status?: string;
    }
  ): Promise<Event[]> {
    const query: any = { account: new Types.ObjectId(accountId) };

    if (filters?.startDate && filters?.endDate) {
      query.date = {
        $gte: filters.startDate,
        $lte: filters.endDate
      };
    }

    if (filters?.technicianId) {
      query.technician = filters.technicianId;
    }

    if (filters?.customerId) {
      query.customer = filters.customerId;
    }

    if (filters?.status) {
      query.status = filters.status;
    } else {
      // By default, exclude completed events from calendar view
      query.status = { $ne: 'completed' };
    }

    return this.eventModel
      .find(query)
      .populate('customer', 'name email phone')
      .populate('technician', 'name email phone')
      .populate('serviceOrder', 'orderNumber status')
      .sort({ date: 1, startTime: 1 })
      .lean()
      .exec();
  }

  async findByIdAndAccount(id: string, accountId: string): Promise<Event | null> {
    return this.eventModel
      .findOne({ _id: id, account: accountId })
      .populate('customer', 'name email phone')
      .populate('technician', 'name email phone')
      .populate('serviceOrder')
      .lean()
      .exec();
  }

  async updateByAccount(id: string, updateData: Partial<Event>, accountId: string): Promise<Event | null> {
    const event = await this.eventModel.findOne({ _id: id, account: accountId });

    if (!event) {
      return null;
    }

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
        event.title = `${customer.name} - ${technician.name}`;
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

  async deleteByAccount(id: string, accountId: string): Promise<boolean> {
    const result = await this.eventModel.findOneAndDelete({
      _id: id,
      account: accountId
    });

    return !!result;
  }
}
