import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ServicesService } from './services.service';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) { }

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create services
  create(@Body() createServiceDto: any, @Request() req: any) {
    // Override account with the one from JWT token
    createServiceDto.account = req.user.account;
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  findAll(@Request() req: any) {
    // Always filter by the user's account from JWT token
    return this.servicesService.findByAccount(req.user.account.toString());
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.servicesService.findOne(id, req.user.account.toString());
  }

  @Patch(':id')
  @Roles('ADMIN') // Only users with ADMIN role can update services
  update(@Param('id') id: string, @Body() updateServiceDto: any, @Request() req: any) {
    return this.servicesService.update(id, updateServiceDto, req.user.account.toString());
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete services
  remove(@Param('id') id: string, @Request() req: any) {
    return this.servicesService.delete(id, req.user.account.toString());
  }
}