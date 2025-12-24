import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuotesService } from '../quotes/quotes.service';
import { ServiceOrder, ServiceOrderDocument, ServiceOrderItem } from './schemas/service-order.schema';

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectModel(ServiceOrder.name) private serviceOrderModel: Model<ServiceOrderDocument>,
    private quotesService: QuotesService
  ) {}

  async create(serviceOrderData: Partial<ServiceOrder>): Promise<ServiceOrder> {
    // Generate order number if not provided
    if (!serviceOrderData.orderNumber) {
      const year = new Date().getFullYear();
      const count = await this.serviceOrderModel.countDocuments();
      serviceOrderData.orderNumber = `SO-${year}-${String(count + 1).padStart(6, '0')}`;
    }

    const createdServiceOrder = new this.serviceOrderModel(serviceOrderData);
    const savedServiceOrder = await createdServiceOrder.save();
    return savedServiceOrder.toObject() as any;
  }

  async createFromQuote(quoteId: string, priority: 'low' | 'normal' | 'high' | 'urgent', accountId: string): Promise<ServiceOrder> {
    // Fetch the quote with populated services and products
    const quote = await this.quotesService.findByIdAndAccount(quoteId, accountId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    // Check if quote is in sent status
    if (quote.status !== 'sent') {
      throw new Error('Quote must be in sent status to create service order');
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
    const totalValue = subtotal - (quote.discount || 0);

    // Create service order
    const serviceOrderData = {
      quote: new Types.ObjectId(quoteId),
      customer: quote.customer._id || quote.customer,
      equipments: quote.equipments || [],
      account: new Types.ObjectId(accountId),
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

  async findAll(): Promise<ServiceOrder[]> {
    return this.serviceOrderModel.find().exec();
  }

  async findByAccount(
    accountId: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: string
  ): Promise<{
    serviceOrders: ServiceOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery: any = { account: new Types.ObjectId(accountId) };
    if (search) {
      searchQuery.$or = [{ orderNumber: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    }
    if (status) {
      searchQuery.status = status;
    }

    const [serviceOrders, total] = await Promise.all([
      this.serviceOrderModel
        .find(searchQuery)
        .populate('account', 'name id')
        .populate('customer', 'name email id')
        .populate('quote', 'quoteId')
        .populate('assignedTechnician', 'name email id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.serviceOrderModel.countDocuments(searchQuery).exec()
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      serviceOrders: serviceOrders.map((so) => so.toObject()),
      total,
      page,
      limit,
      totalPages
    };
  }

  async findOne(id: string): Promise<ServiceOrder | null> {
    return this.serviceOrderModel.findById(id).exec();
  }

  async findByIdAndAccount(id: string, accountId: string): Promise<ServiceOrderDocument | null> {
    const serviceOrder = await this.serviceOrderModel
      .findOne({ _id: id, account: new Types.ObjectId(accountId) })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .populate('quote', 'quoteId')
      .populate('assignedTechnician', 'name email id')
      .populate('items.service', 'name')
      .populate('items.product', 'name')
      .exec();

    return serviceOrder;
  }

  async update(id: string, serviceOrderData: Partial<ServiceOrder>): Promise<ServiceOrder | null> {
    return this.serviceOrderModel.findByIdAndUpdate(id, serviceOrderData, { new: true }).exec();
  }

  async updateByAccount(id: string, serviceOrderData: Partial<ServiceOrder>, accountId: string): Promise<ServiceOrder | null> {
    const query = { _id: id, account: new Types.ObjectId(accountId) };

    const updatedServiceOrder = await this.serviceOrderModel
      .findOneAndUpdate(query, serviceOrderData, { new: true })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .populate('quote', 'quoteId')
      .populate('assignedTechnician', 'name email id')
      .exec();

    return updatedServiceOrder;
  }

  async delete(id: string): Promise<ServiceOrder | null> {
    return this.serviceOrderModel.findByIdAndDelete(id).exec();
  }

  async deleteByAccount(id: string, accountId: string): Promise<ServiceOrder | null> {
    const query = { _id: id, account: new Types.ObjectId(accountId) };
    return this.serviceOrderModel.findOneAndDelete(query).exec();
  }
}
