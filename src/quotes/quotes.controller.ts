import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuotesService } from './quotes.service';

@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN') // Multiple roles can create quotes
  async create(@Body() dto: CreateQuoteDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
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

    // All authenticated users can see quotes in their account
    return this.quotesService.findByAccount(accountId, pageNum, limitNum, search, status || undefined, customerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.quotesService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN') // Multiple roles can update quotes
  async update(@Param('id') id: string, @Body() dto: UpdateQuoteDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
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
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.quotesService.updateByAccount(id, quoteData, accountId);
  }

  @Put(':id/send')
  @Roles('ADMIN', 'SUPERVISOR')
  async send(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.quotesService.sendQuote(id, accountId, new Types.ObjectId(userId));
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR') // Only ADMIN and SUPERVISOR can delete quotes
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.quotesService.deleteByAccount(id, accountId);
  }
}
