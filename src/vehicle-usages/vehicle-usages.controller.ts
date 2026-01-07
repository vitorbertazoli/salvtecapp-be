import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VehicleUsage } from './schemas/vehicle-usages.schema';
import { VehicleUsagesService } from './vehicle-usages.service';

@Controller('vehicle-usages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleUsagesController {
  constructor(private readonly vehicleUsagesService: VehicleUsagesService) {}

  @Post()
  @Roles('TECHNICIAN', 'SUPERVISOR', 'ADMIN')
  async create(@Body() createDto: Partial<VehicleUsage>, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    createDto.createdBy = userId as any;
    createDto.updatedBy = userId as any;
    createDto.account = accountId as any;
    return this.vehicleUsagesService.create(createDto);
  }

  @Get()
  findAll(@GetAccountId() accountId: Types.ObjectId) {
    return this.vehicleUsagesService.findAll(accountId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    const usage = await this.vehicleUsagesService.findOne(id, accountId);
    if (!usage) throw new NotFoundException('Vehicle usage not found');
    return usage;
  }

  @Patch(':id')
  @Roles('SUPERVISOR', 'ADMIN')
  async update(@Param('id') id: string, @Body() updateDto: Partial<VehicleUsage>, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    updateDto.updatedBy = userId as any;
    const usage = await this.vehicleUsagesService.update(id, updateDto, accountId);
    if (!usage) throw new NotFoundException('Vehicle usage not found');
    return usage;
  }

  @Post(':id/approve')
  @Roles('SUPERVISOR', 'ADMIN')
  async approve(@Param('id') id: string, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const usage = await this.vehicleUsagesService.approve(id, userId, accountId);
    if (!usage) throw new NotFoundException('Vehicle usage not found');
    return usage;
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    const usage = await this.vehicleUsagesService.remove(id, accountId);
    if (!usage) throw new NotFoundException('Vehicle usage not found');
    return usage;
  }
}
