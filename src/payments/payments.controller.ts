import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SimulateContractPaymentsDto } from './dto/simulate-contract-payments.dto';
import { UpdatePaymentOrderDto } from './dto/update-payment-order.dto';
import { PaymentsService } from './payments.service';
import { PaymentOrder } from './schemas/payment-order.schema';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('from-service-order')
  @Roles('ADMIN', 'SUPERVISOR')
  async createFromServiceOrder(
    @GetAccountId() accountId: Types.ObjectId,
    @Query('serviceOrderId') serviceOrderId: string,
    @GetUser('id') userId: string
  ): Promise<PaymentOrder> {
    return this.paymentsService.createFromServiceOrder(accountId, serviceOrderId, new Types.ObjectId(userId));
  }

  @Post('from-contract')
  @Roles('ADMIN', 'SUPERVISOR')
  async createFromContract(
    @GetAccountId() accountId: Types.ObjectId,
    @Query('contractId') contractId: string,
    @GetUser('id') userId: string
  ): Promise<PaymentOrder[]> {
    return this.paymentsService.createFromContract(accountId, contractId, new Types.ObjectId(userId));
  }

  @Post('simulate-contract')
  @Roles('ADMIN', 'SUPERVISOR')
  async simulateContractPayments(@Body() dto: SimulateContractPaymentsDto) {
    return this.paymentsService.simulateContractPayments(dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR')
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
  @Roles('ADMIN', 'SUPERVISOR')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId): Promise<PaymentOrder> {
    return this.paymentsService.findOne(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(
    @Param('id') id: string,
    @GetAccountId() accountId: Types.ObjectId,
    @Body() updateData: UpdatePaymentOrderDto,
    @GetUser('id') userId: string
  ): Promise<PaymentOrder> {
    return this.paymentsService.update(id, accountId, updateData, new Types.ObjectId(userId));
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId): Promise<{ message: string }> {
    await this.paymentsService.remove(id, accountId);
    return { message: 'Payment order deleted successfully' };
  }
}
