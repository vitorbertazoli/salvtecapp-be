import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  create(@Body() dto: CreateVehicleDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const vehicleData = {
      ...dto,
      account: accountId,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.vehiclesService.create(vehicleData);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @GetAccountId() accountId: Types.ObjectId
  ) {
    // Always filter by the user's account from JWT token
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.vehiclesService.findAll(accountId, pageNum, limitNum, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    const vehicle = await this.vehiclesService.findOne(id, accountId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const vehicleData = {
      ...dto,
      updatedBy: new Types.ObjectId(userId)
    } as any;

    const vehicle = await this.vehiclesService.update(id, vehicleData, accountId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    const vehicle = await this.vehiclesService.remove(id, accountId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }
}
