import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentsService } from '../payments/payments.service';
import { ContractsService } from './contracts.service';
import { ApproveContractChangeOrderDto } from './dto/approve-change-order.dto';
import { CreateContractChangeOrderDto } from './dto/create-change-order.dto';

@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly paymentsService: PaymentsService
  ) {}

  @Get()
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can view contracts
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @GetAccountId() accountId: Types.ObjectId
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // All authenticated users can see contracts in their account
    return this.contractsService.findByAccount(accountId, pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can view contracts
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.contractsService.findByIdAndAccount(id, accountId);
  }

  @Get(':id/payments')
  @Roles('ADMIN', 'SUPERVISOR')
  async findPayments(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.paymentsService.findByContract(accountId, id);
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete contracts
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.contractsService.deleteByAccount(id, accountId);
  }

  @Post(':id/change-orders')
  @Roles('ADMIN', 'SUPERVISOR')
  async createChangeOrder(
    @Param('id') id: string,
    @Body() dto: CreateContractChangeOrderDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string
  ) {
    const changeData = {
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.expireDate && { expireDate: new Date(dto.expireDate) }),
      ...(dto.frequency && { frequency: dto.frequency }),
      ...(dto.maintenanceFrequency && { maintenanceFrequency: dto.maintenanceFrequency }),
      ...(dto.paymentFrequency && { paymentFrequency: dto.paymentFrequency }),
      ...(dto.firstPaymentDate && { firstPaymentDate: new Date(dto.firstPaymentDate) }),
      ...(dto.services && {
        services: dto.services.map((service) => ({
          ...service,
          service: new Types.ObjectId(service.service)
        }))
      }),
      ...(dto.terms !== undefined && { terms: dto.terms }),
      ...(dto.value !== undefined && { value: dto.value })
    } as any;

    return this.contractsService.createChangeOrder(id, changeData, accountId, new Types.ObjectId(userId), dto.description);
  }

  @Put(':id/change-orders/:version')
  @Roles('ADMIN', 'SUPERVISOR')
  async approveOrRejectChangeOrder(
    @Param('id') id: string,
    @Param('version') version: string,
    @Body() dto: ApproveContractChangeOrderDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string
  ) {
    const changeOrderVersion = parseInt(version, 10);
    if (dto.action === 'approve') {
      return this.contractsService.approveChangeOrder(id, changeOrderVersion, accountId, new Types.ObjectId(userId));
    }

    return this.contractsService.rejectChangeOrder(id, changeOrderVersion, accountId, new Types.ObjectId(userId));
  }
}
