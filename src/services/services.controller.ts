import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Request, Put } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ServicesService } from './services.service';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create services
  create(@Body() createServiceDto: any, @Request() req: any) {
    // Override account with the one from JWT token
    createServiceDto.account = req.user.account;
    createServiceDto.createdBy = req.user.id;
    createServiceDto.updatedBy = req.user.id;
    return this.servicesService.create(createServiceDto);
  }

  @Get()
  findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10', @Query('search') search: string = '', @Request() req: any) {
    // Always filter by the user's account from JWT token
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.servicesService.findByAccount(req.user.account.toString(), pageNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.servicesService.findOne(id, req.user.account.toString());
  }

  @Put(':id')
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
