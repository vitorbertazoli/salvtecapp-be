import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { QuoteToServiceOrderService } from '../quote-to-service-order/quote-to-service-order.service';
import { ServiceOrder, ServiceOrderDocument, ServiceOrderItem } from './schemas/service-order.schema';

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectModel(ServiceOrder.name) private serviceOrderModel: Model<ServiceOrderDocument>,
    private quoteToServiceOrderService: QuoteToServiceOrderService
  ) {}

  async create(serviceOrderData: Partial<ServiceOrder>): Promise<ServiceOrder> {
    // Generate order number if not provided
    if (!serviceOrderData.orderNumber) {
      const year = new Date().getFullYear();
      // generate a 6 digit random string using bcrypt, remove special characters and take first 8 characters
      const randomString = (await bcrypt.hash(Date.now().toString(), 5)).replace(/\W/g, '').slice(0, 8).toUpperCase();
      serviceOrderData.orderNumber = `SO-${year}-${randomString}`;
    }

    const createdServiceOrder = new this.serviceOrderModel(serviceOrderData);
    const savedServiceOrder = await createdServiceOrder.save();
    return savedServiceOrder.toObject() as any;
  }

  async findByAccount(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: string,
    customerId?: string
  ): Promise<{
    serviceOrders: ServiceOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions: any = { account: accountId };
    if (status) {
      matchConditions.status = status;
    }
    if (customerId) {
      matchConditions.customer = new Types.ObjectId(customerId);
    }

    // Build search pipeline
    const pipeline: any[] = [
      { $match: matchConditions },
      // Join with customers collection
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      // Join with accounts collection
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
      // Join with quotes collection
      {
        $lookup: {
          from: 'quotes',
          localField: 'quote',
          foreignField: '_id',
          as: 'quote'
        }
      },
      { $unwind: { path: '$quote', preserveNullAndEmptyArrays: true } },
      // Join with technicians collection
      {
        $lookup: {
          from: 'technicians',
          localField: 'assignedTechnician',
          foreignField: '_id',
          as: 'assignedTechnician'
        }
      },
      { $unwind: { path: '$assignedTechnician', preserveNullAndEmptyArrays: true } }
    ];

    // Add search filter if search term is provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { orderNumber: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { _id: Types.ObjectId.isValid(search) ? new Types.ObjectId(search) : undefined },
            { 'customer.name': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add sorting, pagination
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Project to limit fields
      {
        $project: {
          'account.name': 1,
          'account.id': 1,
          'customer.name': 1,
          'customer.email': 1,
          'customer.phoneNumbers': 1,
          'customer.address': 1,
          'customer.id': 1,
          'quote.quoteId': 1,
          'assignedTechnician.name': 1,
          'assignedTechnician.email': 1,
          'assignedTechnician.phoneNumber': 1,
          'assignedTechnician.id': 1,
          orderNumber: 1,
          equipments: 1,
          items: 1,
          description: 1,
          discount: 1,
          subtotal: 1,
          totalValue: 1,
          issuedAt: 1,
          scheduledDate: 1,
          startedAt: 1,
          completedAt: 1,
          status: 1,
          priority: 1,
          notes: 1,
          customerNotes: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    );

    // Get total count with search filter
    const countPipeline = [...pipeline];
    countPipeline.splice(countPipeline.length - 3, 3, { $count: 'total' });

    const [serviceOrders, countResult] = await Promise.all([
      this.serviceOrderModel.aggregate(pipeline).exec(),
      search ? this.serviceOrderModel.aggregate(countPipeline).exec() : this.serviceOrderModel.countDocuments(matchConditions).exec()
    ]);

    const total = search && Array.isArray(countResult) && countResult.length > 0 ? countResult[0].total : (countResult as number);
    const totalPages = Math.ceil(total / limit);

    return {
      serviceOrders,
      total,
      page,
      limit,
      totalPages
    };
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<ServiceOrderDocument | null> {
    const serviceOrder = await this.serviceOrderModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('customer', 'name email phoneNumbers address id')
      .populate('quote', 'quoteId')
      .populate('assignedTechnician', 'name email phoneNumber id')
      .populate('items.service', 'name')
      .populate('items.product', 'name')
      .exec();

    return serviceOrder;
  }

  async updateByAccount(id: string, serviceOrderData: Partial<ServiceOrder>, accountId: Types.ObjectId): Promise<ServiceOrder | null> {
    const query = { _id: id, account: accountId };

    const updatedServiceOrder = await this.serviceOrderModel
      .findOneAndUpdate(query, serviceOrderData, { new: true })
      .populate('account', 'name id')
      .populate('customer', 'name email address id')
      .populate('quote', 'quoteId')
      .populate('assignedTechnician', 'name email id')
      .exec();

    return updatedServiceOrder;
  }

  async deleteByAccount(id: string, accountId: Types.ObjectId): Promise<ServiceOrder | null> {
    const query = { _id: id, account: accountId };
    return this.serviceOrderModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.serviceOrderModel.deleteMany({ account: accountId }).exec();
  }

  async findByCustomerAndAccount(customerId: string, accountId: Types.ObjectId): Promise<ServiceOrder[]> {
    return this.serviceOrderModel
      .find({
        customer: new Types.ObjectId(customerId),
        account: accountId,
        status: { $in: ['pending', 'scheduled', 'in_progress'] }
      })
      .populate('customer', 'name email phoneNumbers address id')
      .populate('assignedTechnician', 'name email phoneNumber id')
      .select('orderNumber description status priority scheduledDate createdAt customer assignedTechnician')
      .sort({ createdAt: -1 })
      .exec();
  }

  async createChangeOrder(
    serviceOrderId: string,
    modifiedItems: ServiceOrderItem[],
    accountId: Types.ObjectId,
    userId: Types.ObjectId,
    description?: string,
    discount?: number,
    otherDiscounts?: { description: string; amount: number }[],
    equipments?: any[]
  ): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderModel.findOne({ _id: serviceOrderId, account: accountId }).exec();
    if (!serviceOrder) {
      throw new NotFoundException('serviceOrders.errors.notFound');
    }

    // Calculate new version
    const version = (serviceOrder.changeOrders?.length || 0) + 1;

    // Calculate totals for modified items
    const subtotal = modifiedItems.reduce((sum, item) => sum + item.totalValue, 0);
    const discountAmount = subtotal * ((discount || 0) / 100);
    const otherDiscountsTotal = (otherDiscounts || []).reduce((sum, od) => sum + od.amount, 0);
    const totalValue = subtotal - discountAmount - otherDiscountsTotal;

    const changeOrder = {
      version,
      originalItems: serviceOrder.items,
      modifiedItems,
      originalEquipments: serviceOrder.equipments || [],
      modifiedEquipments: equipments || [],
      description,
      discount: discount || 0,
      otherDiscounts: otherDiscounts || [],
      subtotal,
      totalValue,
      status: 'pending' as const,
      createdBy: userId,
      createdAt: new Date()
    };

    // Add change order to service order
    serviceOrder.changeOrders = serviceOrder.changeOrders || [];
    serviceOrder.changeOrders.push(changeOrder);
    serviceOrder.updatedBy = userId;

    return serviceOrder.save();
  }

  async approveChangeOrder(serviceOrderId: string, changeOrderVersion: number, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderModel.findOne({ _id: serviceOrderId, account: accountId }).exec();
    if (!serviceOrder) {
      throw new NotFoundException('serviceOrders.notFound');
    }

    const changeOrder = serviceOrder.changeOrders?.find((co) => co.version === changeOrderVersion);
    if (!changeOrder) {
      throw new NotFoundException('serviceOrders.errors.changeOrderNotFound');
    }

    if (changeOrder.status !== 'pending') {
      throw new BadRequestException('serviceOrders.errors.changeOrderNotPending');
    }

    // Update change order status
    changeOrder.status = 'approved';
    changeOrder.approvedAt = new Date();
    changeOrder.approvedBy = userId;

    // Update service order items and totals
    serviceOrder.items = changeOrder.modifiedItems;
    serviceOrder.subtotal = changeOrder.subtotal;
    serviceOrder.totalValue = changeOrder.totalValue;
    serviceOrder.discount = changeOrder.discount;
    serviceOrder.otherDiscounts = changeOrder.otherDiscounts;
    serviceOrder.equipments = changeOrder.modifiedEquipments || [];
    serviceOrder.updatedBy = userId;

    // Mark changeOrders as modified for Mongoose to detect the change
    serviceOrder.markModified('changeOrders');

    const savedServiceOrder = await serviceOrder.save();
    return savedServiceOrder;
  }

  async rejectChangeOrder(serviceOrderId: string, changeOrderVersion: number, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<ServiceOrder> {
    const serviceOrder = await this.serviceOrderModel.findOne({ _id: serviceOrderId, account: accountId }).exec();
    if (!serviceOrder) {
      throw new NotFoundException('serviceOrders.notFound');
    }

    const changeOrder = serviceOrder.changeOrders?.find((co) => co.version === changeOrderVersion);
    if (!changeOrder) {
      throw new NotFoundException('serviceOrders.errors.changeOrderNotFound');
    }

    if (changeOrder.status !== 'pending') {
      throw new BadRequestException('serviceOrders.errors.changeOrderNotPending');
    }

    // Update change order status
    changeOrder.status = 'rejected';
    changeOrder.approvedBy = userId; // Use approvedBy for rejection as well

    serviceOrder.updatedBy = userId;

    // Mark changeOrders as modified for Mongoose to detect the change
    serviceOrder.markModified('changeOrders');

    return serviceOrder.save();
  }
}
