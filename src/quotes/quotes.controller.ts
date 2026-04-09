import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QuoteToServiceOrderService } from '../quote-to-service-order/quote-to-service-order.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuotesService } from './quotes.service';

const roundCurrency = (value: number) => Math.ceil(Math.max(0, value) * 100) / 100;

const calculateQuoteTotals = (dto: {
  services?: { quantity?: number; unitValue?: number }[];
  products?: { quantity?: number; unitValue?: number }[];
  discount?: number;
  otherDiscounts?: { amount?: number }[];
  applyServiceTax?: boolean;
  serviceTaxPercent?: number;
}) => {
  const servicesTotal = (dto.services || []).reduce((sum, service) => sum + (service.quantity || 0) * (service.unitValue || 0), 0);
  const productsTotal = (dto.products || []).reduce((sum, product) => sum + (product.quantity || 0) * (product.unitValue || 0), 0);
  const subtotal = servicesTotal + productsTotal;
  const serviceTaxAmount = dto.applyServiceTax && (dto.serviceTaxPercent || 0) > 0 ? roundCurrency((servicesTotal * (dto.serviceTaxPercent || 0)) / 100) : 0;
  const discountValue = dto.discount ? (subtotal * dto.discount) / 100 : 0;
  const otherDiscountsTotal = (dto.otherDiscounts || []).reduce((sum, discount) => sum + (discount.amount || 0), 0);

  return {
    serviceTaxAmount,
    totalValue: roundCurrency(subtotal + serviceTaxAmount - discountValue - otherDiscountsTotal)
  };
};

@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly quoteToServiceOrderService: QuoteToServiceOrderService
  ) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN') // Multiple roles can create quotes
  async create(@Body() dto: CreateQuoteDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const { serviceTaxAmount, totalValue } = calculateQuoteTotals(dto);
    const quoteData = {
      ...dto,
      account: accountId,
      customer: new Types.ObjectId(dto.customer),
      ...(dto.services && {
        services: dto.services.map((service) => ({
          ...service,
          service: new Types.ObjectId(service.service)
        }))
      }),
      ...(dto.products && {
        products: dto.products.map((product) => ({
          ...product,
          product: new Types.ObjectId(product.product)
        }))
      }),
      applyServiceTax: dto.applyServiceTax ?? true,
      serviceTaxPercent: dto.serviceTaxPercent ?? 0,
      serviceTaxAmount,
      totalValue,
      status: 'draft',
      issuedAt: new Date(),
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.quotesService.create(quoteData);
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @GetAccountId() accountId: Types.ObjectId,
    @Query('customer') customerId?: string
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const statuses = status
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    // All authenticated users can see quotes in their account
    return this.quotesService.findByAccount(accountId, pageNum, limitNum, search, statuses.length > 0 ? statuses : undefined, customerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.quoteToServiceOrderService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN') // Multiple roles can update quotes
  async update(@Param('id') id: string, @Body() dto: UpdateQuoteDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const nextApplyServiceTax = dto.applyServiceTax ?? false;
    const nextServiceTaxPercent = dto.serviceTaxPercent ?? 0;
    const { serviceTaxAmount, totalValue } = calculateQuoteTotals({
      ...dto,
      applyServiceTax: nextApplyServiceTax,
      serviceTaxPercent: nextServiceTaxPercent
    });

    const quoteData = {
      ...dto,
      ...(dto.customer && { customer: new Types.ObjectId(dto.customer) }),
      ...(dto.services && {
        services: dto.services.map((service) => ({
          ...service,
          ...(service.service && { service: new Types.ObjectId(service.service) })
        }))
      }),
      ...(dto.products && {
        products: dto.products.map((product) => ({
          ...product,
          ...(product.product && { product: new Types.ObjectId(product.product) })
        }))
      }),
      ...(dto.applyServiceTax !== undefined && { applyServiceTax: nextApplyServiceTax }),
      ...(dto.serviceTaxPercent !== undefined && { serviceTaxPercent: nextServiceTaxPercent }),
      ...(dto.applyServiceTax !== undefined ||
      dto.serviceTaxPercent !== undefined ||
      dto.services ||
      dto.products ||
      dto.discount !== undefined ||
      dto.otherDiscounts
        ? { serviceTaxAmount, totalValue }
        : {}),
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.quoteToServiceOrderService.updateByAccount(id, quoteData, accountId, new Types.ObjectId(userId));
  }

  @Put(':id/send')
  @Roles('ADMIN', 'SUPERVISOR')
  async send(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.quotesService.sendQuote(id, accountId, new Types.ObjectId(userId));
  }

  @Patch(':id/mark-as-sent')
  @Roles('ADMIN', 'SUPERVISOR')
  async markAsSent(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.quotesService.markAsSent(id, accountId, new Types.ObjectId(userId));
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async updatePartial(@Param('id') id: string, @Body() dto: UpdateQuoteDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const quoteData = { ...dto, updatedBy: new Types.ObjectId(userId) } as any;
    return this.quoteToServiceOrderService.updateByAccount(id, quoteData, accountId, new Types.ObjectId(userId));
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR') // Only ADMIN and SUPERVISOR can delete quotes
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.quotesService.deleteByAccount(id, accountId);
  }
}
