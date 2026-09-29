import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { CustomerVehiclesService } from '../customer-vehicles/customer-vehicles.service';
import { CustomersService } from '../customers/customers.service';
import { ProductsService } from '../products/products.service';
import { Quote, QuoteDocument } from '../quotes/schemas/quote.schema';
import { ServiceOrder, ServiceOrderDocument, ServiceOrderItem } from '../service-orders/schemas/service-order.schema';
import { calculateServiceOrderTotals } from '../service-orders/utils/service-order-totals';
import { ServicesService } from '../services/services.service';

@Injectable()
export class QuoteToServiceOrderService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    @InjectModel(ServiceOrder.name) private serviceOrderModel: Model<ServiceOrderDocument>,
    private readonly customersService: CustomersService,
    private readonly customerVehiclesService: CustomerVehiclesService,
    private readonly servicesService: ServicesService,
    private readonly productsService: ProductsService
  ) {}

  async validateQuoteData(data: Partial<Quote>, accountId: Types.ObjectId): Promise<void> {
    if (data.customer) {
      const customer = await this.customersService.findByIdAndAccount(data.customer.toString(), accountId);
      if (!customer) {
        throw new BadRequestException('quotes.errors.customerNotFound');
      }
    }

    const quoteType = data.quoteType || 'home';
    if (quoteType === 'home' && (data.customerVehicle || data.vehicleDetails)) {
      throw new BadRequestException('quotes.errors.vehicleOnlyForAuto');
    }

    if (data.customerVehicle) {
      if (!data.customer) {
        throw new BadRequestException('quotes.errors.customerRequiredForVehicle');
      }
      const vehicle = await this.customerVehiclesService.findByIdAndAccount(data.customerVehicle.toString(), accountId);
      if (!vehicle || vehicle.customer.toString() !== data.customer.toString()) {
        throw new BadRequestException('quotes.errors.customerVehicleNotFound');
      }
    }

    for (const line of data.services || []) {
      const service = await this.servicesService.findOne(line.service.toString(), accountId);
      if (!service || !this.isCompatible(service.applicability, quoteType)) {
        throw new BadRequestException('quotes.errors.invalidServiceForQuoteType');
      }
    }

    for (const line of data.products || []) {
      const product = await this.productsService.findOne(line.product.toString(), accountId);
      if (!product || !this.isCompatible(product.applicability, quoteType)) {
        throw new BadRequestException('quotes.errors.invalidProductForQuoteType');
      }
    }
  }

  private isCompatible(applicability: 'home' | 'auto' | 'both' | undefined, quoteType: 'home' | 'auto'): boolean {
    const effectiveApplicability = applicability || 'home';
    return effectiveApplicability === 'both' || effectiveApplicability === quoteType;
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<QuoteDocument | null> {
    const quote = await this.quoteModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .populate('customerVehicle', 'make model year')
      .populate('services.service', 'name description')
      .populate('products.product', 'name description maker model sku unit')
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

    const currentQuoteType = currentQuote.quoteType || 'home';
    if (quoteData.quoteType && quoteData.quoteType !== currentQuoteType) {
      throw new BadRequestException('quotes.errors.quoteTypeImmutable');
    }

    const updateData = { ...quoteData };

    const currentCustomerId = currentQuote.customer ? currentQuote.customer.toString() : '';
    const nextCustomerId = quoteData.customer ? quoteData.customer.toString() : '';
    const customerChanged = !!nextCustomerId && nextCustomerId !== currentCustomerId;

    // When changing customer, stale equipments from previous customer must not remain.
    if (customerChanged && quoteData.equipments === undefined) {
      updateData.equipments = [];
    }
    if (customerChanged && quoteData.customerVehicle === undefined) {
      updateData.customerVehicle = null as any;
    }

    const nextQuoteData = {
      ...(typeof currentQuote.toObject === 'function' ? currentQuote.toObject() : currentQuote),
      ...updateData,
      customer: quoteData.customer || currentQuote.customer,
      quoteType: currentQuoteType
    } as Partial<Quote>;
    await this.validateQuoteData(
      {
        ...nextQuoteData,
        services: quoteData.services,
        products: quoteData.products
      },
      accountId
    );

    if ((currentQuote.status === 'sent' || currentQuote.status === 'draft') && quoteData.status === 'rejected') {
      updateData.status = 'rejected';
    } else if (quoteData.status === 'accepted' && (currentQuote.status === 'sent' || currentQuote.status === 'draft')) {
      updateData.status = 'accepted';
    } else {
      updateData.status = 'draft';
    }

    if (userId) {
      updateData.updatedBy = userId;
    }

    const updatedQuote = await this.quoteModel
      .findOneAndUpdate(query, updateData, { new: true })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .populate('customerVehicle', 'make model year')
      .populate('services.service', 'name description')
      .populate('products.product', 'name description maker model sku unit')
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
    const applyServiceTax = quote.applyServiceTax ?? false;
    const serviceTaxPercent = quote.serviceTaxPercent ?? 0;
    const { subtotal, serviceTaxAmount, totalValue } = calculateServiceOrderTotals({
      items,
      discount: quote.discount || 0,
      otherDiscounts: quote.otherDiscounts || [],
      applyServiceTax,
      serviceTaxPercent
    });

    // Generate order number
    const year = new Date().getFullYear();
    const randomString = (await bcrypt.hash(Date.now().toString(), 5)).replace(/\W/g, '').slice(0, 8).toUpperCase();
    const orderNumber = `SO-${year}-${randomString}`;

    // Create service order
    const serviceOrderData = {
      quote: new Types.ObjectId(quoteId),
      customer: quote.customer._id || quote.customer,
      quoteType: quote.quoteType || 'home',
      customerVehicle: quote.customerVehicle ? (quote.customerVehicle as any)._id || quote.customerVehicle : undefined,
      vehicleDetails: quote.vehicleDetails,
      equipments: quote.equipments || [],
      account: accountId,
      orderNumber,
      items,
      description: quote.description,
      discount: quote.discount || 0,
      applyServiceTax,
      serviceTaxPercent,
      serviceTaxAmount,
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
