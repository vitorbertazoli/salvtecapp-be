import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create services
  create(@Body() createServiceDto: CreateServiceDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const serviceData = {
      ...createServiceDto,
      account: accountId,
      createdBy: userId,
      updatedBy: userId
    };
    return this.servicesService.create(serviceData);
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
    return this.servicesService.findByAccount(accountId, pageNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.servicesService.findOne(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN') // Only users with ADMIN role can update services
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const serviceData = {
      ...updateServiceDto,
      updatedBy: userId
    };
    return this.servicesService.update(id, serviceData, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete services
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.servicesService.delete(id, accountId);
  }
}
