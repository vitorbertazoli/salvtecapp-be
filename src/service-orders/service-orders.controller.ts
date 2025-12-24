import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ServiceOrdersService } from './service-orders.service';

@Controller('service-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  async create(@Body() createServiceOrderDto: any, @Request() req: any) {
    // Override account with the one from JWT token
    createServiceOrderDto.account = req.user.account;
    createServiceOrderDto.createdBy = req.user.id;
    createServiceOrderDto.updatedBy = req.user.id;

    return this.serviceOrdersService.create(createServiceOrderDto);
  }

  @Post('from-quote')
  @Roles('ADMIN', 'SUPERVISOR')
  async createFromQuote(@Body() body: { quoteId: string; priority: 'low' | 'normal' | 'high' | 'urgent' }, @Request() req: any) {
    return this.serviceOrdersService.createFromQuote(body.quoteId, body.priority, req.user.account.toString());
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @Request() req: any
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    return this.serviceOrdersService.findByAccount(req.user.account.toString(), pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.serviceOrdersService.findByIdAndAccount(id, req.user.account.toString());
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(@Param('id') id: string, @Body() updateServiceOrderDto: any, @Request() req: any) {
    updateServiceOrderDto.updatedBy = req.user.id;
    return this.serviceOrdersService.updateByAccount(id, updateServiceOrderDto, req.user.account.toString());
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.serviceOrdersService.deleteByAccount(id, req.user.account.toString());
  }
}
