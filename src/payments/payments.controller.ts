import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, Roles } from '../auth/decorators';
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
  async createFromServiceOrder(@GetAccountId() accountId: Types.ObjectId, @Query('serviceOrderId') serviceOrderId: string): Promise<PaymentOrder> {
    return this.paymentsService.createFromServiceOrder(accountId, serviceOrderId);
  }

  @Get()
  @Roles('ADMIN')
  async findAll(
    @GetAccountId() accountId: Types.ObjectId,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ): Promise<{ data: PaymentOrder[]; total: number }> {
    return this.paymentsService.findAll(accountId, page, limit);
  }

  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId): Promise<PaymentOrder> {
    return this.paymentsService.findOne(id, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId): Promise<void> {
    return this.paymentsService.remove(id, accountId);
  }
}
