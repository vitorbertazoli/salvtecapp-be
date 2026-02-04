import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { Quote, QuoteDocument } from '../quotes/schemas/quote.schema';
import { ServiceOrder, ServiceOrderDocument, ServiceOrderItem } from '../service-orders/schemas/service-order.schema';

@Injectable()
export class QuoteToServiceOrderService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    @InjectModel(ServiceOrder.name) private serviceOrderModel: Model<ServiceOrderDocument>
  ) {}

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<QuoteDocument | null> {
    const quote = await this.quoteModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .populate('services.service', 'name')
      .populate('products.product', 'name')
      .exec();

    return quote;
  }

  async updateByAccount(id: string, quoteData: Partial<Quote>, accountId: Types.ObjectId, userId?: Types.ObjectId): Promise<Quote | null> {
    const query = { _id: id, account: accountId };

    // Check current quote status
    const currentQuote = await this.quoteModel.findOne(query).exec();
    if (!currentQuote) {
      return null;
    }

    // If quote has been accepted, do not allow changes
    if (currentQuote.status === 'accepted') {
      throw new BadRequestException('quotes.errors.quoteAlreadyAccepted');
    }

    const updateData = { ...quoteData };
    if ((currentQuote.status === 'sent' || currentQuote.status === 'draft') && quoteData.status === 'rejected') {
      updateData.status = 'rejected';
    } else {
      updateData.status = 'draft';
    }

    const updatedQuote = await this.quoteModel
      .findOneAndUpdate(query, updateData, { new: true })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .exec();

    return updatedQuote;
  }

  async createFromQuote(
    quoteId: string,
    priority: 'low' | 'normal' | 'high' | 'urgent',
    accountId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ServiceOrder> {
    // Fetch the quote with populated services and products
    const quote = await this.findByIdAndAccount(quoteId, accountId);
    if (!quote) {
      throw new NotFoundException('quotes.errors.quoteNotFound');
    }

    // Check if service order already exists for this quote
    const existingServiceOrder = await this.serviceOrderModel.findOne({ quote: new Types.ObjectId(quoteId) }).exec();
    if (existingServiceOrder) {
      throw new BadRequestException('quotes.errors.serviceOrderAlreadyExists');
    }

    // Check if quote is in sent, draft, or accepted status
    if (quote.status !== 'sent' && quote.status !== 'draft' && quote.status !== 'accepted') {
      throw new BadRequestException('quotes.errors.invalidQuoteStatus');
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
    const discountAmount = subtotal * ((quote.discount || 0) / 100);
    const otherDiscountsTotal = (quote.otherDiscounts || []).reduce((sum, od) => sum + od.amount, 0);
    const totalValue = subtotal - discountAmount - otherDiscountsTotal;

    // Generate order number
    const year = new Date().getFullYear();
    const randomString = (await bcrypt.hash(Date.now().toString(), 5)).replace(/\W/g, '').slice(0, 8).toUpperCase();
    const orderNumber = `SO-${year}-${randomString}`;

    // Create service order
    const serviceOrderData = {
      quote: new Types.ObjectId(quoteId),
      customer: quote.customer._id || quote.customer,
      equipments: quote.equipments || [],
      account: accountId,
      orderNumber,
      items,
      description: quote.description,
      discount: quote.discount || 0,
      otherDiscounts: quote.otherDiscounts || [],
      subtotal,
      totalValue,
      issuedAt: new Date(),
      status: 'pending' as const,
      priority,
      createdBy: userId,
      updatedBy: userId
    };

    const createdServiceOrder = new this.serviceOrderModel(serviceOrderData);
    const savedServiceOrder = await createdServiceOrder.save();
    const serviceOrder = savedServiceOrder.toObject() as any;

    // Update quote status to accepted
    await this.updateByAccount(quoteId, { status: 'accepted' }, accountId);

    return serviceOrder;
  }
}
