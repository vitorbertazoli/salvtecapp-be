import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create customers
  async create(@Body() dto: CreateCustomerDto, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const customerData = {
      ...dto,
      account: accountId,
      ...(dto.technicianResponsible && { technicianResponsible: new Types.ObjectId(dto.technicianResponsible) }),
      ...(dto.address && { address: new Types.ObjectId(dto.address) }),
      createdBy: userId,
      updatedBy: userId
    } as any;

    return this.customersService.create(customerData, accountId);
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @GetAccountId() accountId: Types.ObjectId
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // All authenticated users can see customers in their account
    return this.customersService.findByAccount(accountId, pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.customersService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can update customers
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const customerData = {
      ...dto,
      ...(dto.technicianResponsible && { technicianResponsible: new Types.ObjectId(dto.technicianResponsible) }),
      ...(dto.address && { address: new Types.ObjectId(dto.address) }),
      updatedBy: userId
    } as any;

    return this.customersService.updateByAccount(id, customerData, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete customers
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.customersService.deleteByAccount(id, accountId);
  }
}
