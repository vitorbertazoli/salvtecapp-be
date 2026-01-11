import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuotesService } from '../quotes/quotes.service';
import { ServiceOrder, ServiceOrderDocument, ServiceOrderItem } from './schemas/service-order.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectModel(ServiceOrder.name) private serviceOrderModel: Model<ServiceOrderDocument>,
    private quotesService: QuotesService
  ) { }

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

  async createFromQuote(quoteId: string, priority: 'low' | 'normal' | 'high' | 'urgent', accountId: Types.ObjectId): Promise<ServiceOrder> {
    // Fetch the quote with populated services and products
    const quote = await this.quotesService.findByIdAndAccount(quoteId, accountId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    // Check if quote is in sent or draft status
    if (quote.status !== 'sent' && quote.status !== 'draft') {
      throw new Error('Quote must be in sent or draft status to create service order');
    }

    // Create service order items from quote services and products
    const items: ServiceOrderItem[] = [];

    // Add services
    if (quote.services) {
      for (const service of quote.services) {
        items.push({
          type: 'service' as const,
          itemId: service.service._id || service.service,
          name: (service.service as any).name,
          quantity: service.quantity,
          unitValue: service.unitValue,
          totalValue: service.quantity * service.unitValue
        });
      }
    }

    // Add products
    if (quote.products) {
      for (const product of quote.products) {
        items.push({
          type: 'product' as const,
          itemId: product.product._id || product.product,
          name: (product.product as any).name,
          quantity: product.quantity,
          unitValue: product.unitValue,
          totalValue: product.quantity * product.unitValue
        });
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.totalValue, 0);
    const totalValue = subtotal * (1 - (quote.discount || 0) / 100);

    // Create service order
    const serviceOrderData = {
      quote: new Types.ObjectId(quoteId),
      customer: quote.customer._id || quote.customer,
      equipments: quote.equipments || [],
      account: accountId,
      items,
      description: quote.description,
      discount: quote.discount || 0,
      subtotal,
      totalValue,
      issuedAt: new Date(),
      status: 'pending' as const,
      priority
    };

    const serviceOrder = await this.create(serviceOrderData);

    // Update quote status to accepted
    await this.quotesService.updateByAccount(quoteId, { status: 'accepted' }, accountId);

    return serviceOrder;
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
          'customer.phoneNumber': 1,
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
          paymentStatus: 1,
          paidAmount: 1,
          paymentMethod: 1,
          paymentDate: 1,
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
      .populate('customer', 'name email phoneNumber id')
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
      .populate('customer', 'name email id')
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
      .populate('customer', 'name email phoneNumber id')
      .populate('assignedTechnician', 'name email phoneNumber id')
      .select('orderNumber description status priority scheduledDate createdAt customer assignedTechnician')
      .sort({ createdAt: -1 })
      .exec();
  }
}
