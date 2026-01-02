import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Roles, GetAccount, GetUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ServiceOrdersService } from './service-orders.service';

@Controller('service-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) { }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  async create(@Body() createServiceOrderDto: any, @GetAccount() accountId: string, @GetUser('id') userId: string) {
    // Override account with the one from JWT token
    createServiceOrderDto.account = accountId;
    createServiceOrderDto.createdBy = userId;
    createServiceOrderDto.updatedBy = userId;

    return this.serviceOrdersService.create(createServiceOrderDto);
  }

  @Post('from-quote')
  @Roles('ADMIN', 'SUPERVISOR')
  async createFromQuote(@Body() body: { quoteId: string; priority: 'low' | 'normal' | 'high' | 'urgent' }, @GetAccount() accountId: string) {
    return this.serviceOrdersService.createFromQuote(body.quoteId, body.priority, accountId);
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @GetAccount() accountId: string
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    return this.serviceOrdersService.findByAccount(accountId, pageNum, limitNum, search, status || undefined);
  }

  @Get('by-customer/:customerId')
  async findByCustomer(@Param('customerId') customerId: string, @GetAccount() accountId: string) {
    return this.serviceOrdersService.findByCustomerAndAccount(customerId, accountId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccount() accountId: string) {
    return this.serviceOrdersService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(@Param('id') id: string, @Body() updateServiceOrderDto: any, @GetAccount() accountId: string, @GetUser('id') userId: string) {
    updateServiceOrderDto.updatedBy = userId;
    return this.serviceOrdersService.updateByAccount(id, updateServiceOrderDto, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async delete(@Param('id') id: string, @GetAccount() accountId: string) {
    return this.serviceOrdersService.deleteByAccount(id, accountId);
  }
}
