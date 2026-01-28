import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateVehicleUsageDto } from './dto/create-vehicle-usage.dto';
import { UpdateVehicleUsageDto } from './dto/update-vehicle-usage.dto';
import { VehicleUsagesService } from './vehicle-usages.service';

@Controller('vehicle-usages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleUsagesController {
  constructor(private readonly vehicleUsagesService: VehicleUsagesService) {}

  @Post()
  @Roles('TECHNICIAN', 'SUPERVISOR', 'ADMIN')
  async create(@Body() dto: CreateVehicleUsageDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const vehicleUsageData = {
      ...dto,
      account: accountId,
      technician: new Types.ObjectId(dto.technician),
      vehicle: new Types.ObjectId(dto.vehicle),
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.vehicleUsagesService.create(vehicleUsageData);
  }

  @Get()
  findAll(@GetAccountId() accountId: Types.ObjectId) {
    return this.vehicleUsagesService.findAll(accountId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    const usage = await this.vehicleUsagesService.findOne(id, accountId);
    if (!usage) throw new NotFoundException('vehicleUsages.notFound');
    return usage;
  }

  @Patch(':id')
  @Roles('SUPERVISOR', 'ADMIN', 'TECHNICIAN')
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleUsageDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const vehicleUsageData = {
      ...dto,
      updatedBy: new Types.ObjectId(userId)
    } as any;

    const usage = await this.vehicleUsagesService.update(id, vehicleUsageData, accountId);
    if (!usage) throw new NotFoundException('vehicleUsages.notFound');
    return usage;
  }

  @Post(':id/approve')
  @Roles('SUPERVISOR', 'ADMIN')
  async approve(@Param('id') id: string, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const usage = await this.vehicleUsagesService.approve(id, new Types.ObjectId(userId), accountId);
    if (!usage) throw new NotFoundException('vehicleUsages.notFound');
    return usage;
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    const usage = await this.vehicleUsagesService.remove(id, accountId);
    if (!usage) throw new NotFoundException('vehicleUsages.notFound');
    return usage;
  }
}
