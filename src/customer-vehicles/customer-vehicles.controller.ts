import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CustomerVehiclesService } from './customer-vehicles.service';
import { CreateCustomerVehicleDto } from './dto/create-customer-vehicle.dto';
import { UpdateCustomerVehicleDto } from './dto/update-customer-vehicle.dto';

@Controller('customer-vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerVehiclesController {
  constructor(private readonly customerVehiclesService: CustomerVehiclesService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  create(@Body() dto: CreateCustomerVehicleDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.customerVehiclesService.create(
      { ...dto, customer: new Types.ObjectId(dto.customer), createdBy: new Types.ObjectId(userId), updatedBy: new Types.ObjectId(userId) },
      accountId
    );
  }

  @Get()
  findAll(@GetAccountId() accountId: Types.ObjectId, @Query('customer') customerId?: string, @Query('search') search = '') {
    return this.customerVehiclesService.findByAccount(accountId, customerId, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.customerVehiclesService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerVehicleDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.customerVehiclesService.updateByAccount(id, dto, accountId, new Types.ObjectId(userId));
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.customerVehiclesService.deleteByAccount(id, accountId);
  }
}