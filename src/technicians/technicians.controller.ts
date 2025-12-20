import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TechniciansService } from './technicians.service';

@Controller('technicians')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) { }

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create technicians
  async create(@Body() createTechnicianDto: any, @Request() req: any) {
    // Override account with the one from JWT token
    createTechnicianDto.account = req.user.account;
    createTechnicianDto.createdBy = req.user.id;
    createTechnicianDto.updatedBy = req.user.id;

    // Extract address data from the body
    const { address, ...technicianData } = createTechnicianDto;

    return this.techniciansService.create(
      technicianData.account as string,
      technicianData.name as string,
      technicianData.email as string,
      technicianData.cpf as string,
      technicianData.phoneNumber as string,
      address, // Pass the address object directly
      technicianData.createdBy as string,
      technicianData.updatedBy as string
    );
  }

  @Get()
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10', @Query('search') search: string = '', @Request() req: any) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // Check if user has ADMIN role
    const isAdmin = req.user.roles?.some((role: any) => role === 'ADMIN');

    if (isAdmin) {
      // ADMIN can see all technicians in their account
      return this.techniciansService.findByAccount(req.user.account.toString(), pageNum, limitNum, search);
    } else {
      // Regular users cannot access technicians
      return {
        technicians: [],
        total: 0,
        page: 1,
        limit: 1,
        totalPages: 1
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    // Check if user has ADMIN role
    const isAdmin = req.user.roles?.some((role: any) => role === 'ADMIN');

    if (isAdmin) {
      return this.techniciansService.findByIdAndAccount(id, req.user.account.toString());
    } else {
      // Not authorized
      return null;
    }
  }

  @Put(':id')
  @Roles('ADMIN') // Only users with ADMIN role can update technicians
  async update(@Param('id') id: string, @Body() updateTechnicianDto: any, @Request() req: any) {
    updateTechnicianDto.updatedBy = req.user.id;
    return this.techniciansService.update(id, updateTechnicianDto, req.user.account.toString());
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete technicians
  remove(@Param('id') id: string, @Request() req: any) {
    return this.techniciansService.delete(id, req.user.account.toString());
  }
}
