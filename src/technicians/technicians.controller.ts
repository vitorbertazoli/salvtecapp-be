import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Roles, GetAccount, GetUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TechniciansService } from './technicians.service';

@Controller('technicians')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create technicians
  async create(@Body() createTechnicianDto: any, @GetAccount() accountId: string, @GetUser('id') userId: string) {
    // Override account with the one from JWT token
    createTechnicianDto.account = accountId;
    createTechnicianDto.createdBy = userId;
    createTechnicianDto.updatedBy = userId;

    // Extract address and userAccount data from the body
    const { address, userAccount, ...technicianData } = createTechnicianDto;

    return this.techniciansService.create(
      technicianData.account as string,
      technicianData.cpf as string,
      technicianData.phoneNumber as string,
      address, // Pass the address object directly
      technicianData.createdBy as string,
      technicianData.updatedBy as string,
      userAccount // Pass the user account data
    );
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @GetAccount() accountId: string
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    return this.techniciansService.findByAccount(accountId, pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccount() accountId: string, @GetUser() user: any) {
    // Check if user has ADMIN role
    const isAdmin = user.roles?.some((role: any) => role === 'ADMIN');

    if (isAdmin) {
      return this.techniciansService.findByIdAndAccount(id, accountId);
    } else {
      // Not authorized
      return null;
    }
  }

  @Put(':id')
  @Roles('ADMIN') // Only users with ADMIN role can update technicians
  async update(@Param('id') id: string, @Body() updateTechnicianDto: any, @GetAccount() accountId: string, @GetUser('id') userId: string) {
    updateTechnicianDto.updatedBy = userId;

    // Extract address and userAccount data from the body
    const { address, userAccount, ...technicianData } = updateTechnicianDto;

    return this.techniciansService.update(
      id,
      accountId,
      technicianData,
      address, // Pass the address object directly
      userAccount // Pass the user account data
    );
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete technicians
  remove(@Param('id') id: string, @GetAccount() accountId: string) {
    return this.techniciansService.delete(id, accountId);
  }
}
