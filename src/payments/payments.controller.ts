import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentsService } from './payments.service';
import { PaymentOrder } from './schemas/payment-order.schema';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('ADMIN')
  async createFromServiceOrder(
    @GetAccountId() accountId: Types.ObjectId,
    @Query('serviceOrderId') serviceOrderId: string,
    @GetUser('id') userId: string
  ): Promise<PaymentOrder> {
    return this.paymentsService.createFromServiceOrder(accountId, serviceOrderId, new Types.ObjectId(userId));
  }

  @Get()
  @Roles('ADMIN')
  async findAll(
    @GetAccountId() accountId: Types.ObjectId,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('status') status: string = ''
  ): Promise<{ data: PaymentOrder[]; total: number }> {
    return this.paymentsService.findAll(accountId, page, limit, search, status);
  }

  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId): Promise<PaymentOrder> {
    return this.paymentsService.findOne(id, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId): Promise<{ message: string }> {
    await this.paymentsService.remove(id, accountId);
    return { message: 'Payment order deleted successfully' };
  }
}
