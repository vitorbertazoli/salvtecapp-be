import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateFromQuoteDto } from './dto/create-from-quote.dto';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ServiceOrdersService } from './service-orders.service';

@Controller('service-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  async create(@Body() createServiceOrderDto: CreateServiceOrderDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const serviceOrderData = {
      ...createServiceOrderDto,
      account: accountId,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId)
    };
    return this.serviceOrdersService.create(serviceOrderData as any);
  }

  @Post('from-quote')
  @Roles('ADMIN', 'SUPERVISOR')
  async createFromQuote(@Body() body: CreateFromQuoteDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.serviceOrdersService.createFromQuote(body.quoteId, body.priority, accountId, new Types.ObjectId(userId));
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

    return this.serviceOrdersService.findByAccount(accountId, pageNum, limitNum, search, status || undefined, customerId);
  }

  @Get('by-customer/:customerId')
  async findByCustomer(@Param('customerId') customerId: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.serviceOrdersService.findByCustomerAndAccount(customerId, accountId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.serviceOrdersService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(
    @Param('id') id: string,
    @Body() updateServiceOrderDto: UpdateServiceOrderDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string
  ) {
    const serviceOrderData = {
      ...updateServiceOrderDto,
      updatedBy: new Types.ObjectId(userId)
    };
    return this.serviceOrdersService.updateByAccount(id, serviceOrderData as any, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async delete(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.serviceOrdersService.deleteByAccount(id, accountId);
  }
}
