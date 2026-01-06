import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { GetAccount, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Vehicle } from './schemas/vehicles.schema';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  create(@Body() createVehicleDto: Partial<Vehicle>, @GetAccount() accountId: string, @GetUser('id') userId: string) {
    createVehicleDto.account = accountId as any;
    createVehicleDto.createdBy = userId;
    createVehicleDto.updatedBy = userId;
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10', @Query('search') search: string = '', @GetAccount() accountId: string) {
    // Always filter by the user's account from JWT token
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.vehiclesService.findAll(accountId, pageNum, limitNum, search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccount() accountId: string) {
    const vehicle = await this.vehiclesService.findOne(id, accountId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(@Param('id') id: string, @Body() updateVehicleDto: Partial<Vehicle>, @GetAccount() accountId: string, @GetUser('id') userId: string) {
    updateVehicleDto.updatedBy = userId;
    const vehicle = await this.vehiclesService.update(id, updateVehicleDto, accountId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async remove(@Param('id') id: string, @GetAccount() accountId: string) {
    const vehicle = await this.vehiclesService.remove(id, accountId);
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }
}
