import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { Technician } from './schemas/technician.schema';
import { TechniciansService } from './technicians.service';

@Controller('technicians')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TechniciansController {
  constructor(private readonly techniciansService: TechniciansService) {}

  @Post()
  @Roles('ADMIN') // Only users with ADMIN role can create technicians
  async create(@Body() createTechnicianDto: CreateTechnicianDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const userAccount = createTechnicianDto.userAccount
      ? {
          ...createTechnicianDto.userAccount,
          roles: createTechnicianDto.userAccount.roles || []
        }
      : undefined;

    return this.techniciansService.create(
      accountId,
      createTechnicianDto.cpf,
      createTechnicianDto.phoneNumber,
      createTechnicianDto.address,
      userId,
      userId,
      userAccount
    );
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @GetAccountId() accountId: Types.ObjectId
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    return this.techniciansService.findByAccount(accountId, pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId, @GetUser() user: any) {
    // Check if user has ADMIN role
    const isAdmin = user.roles?.some((role: any) => role === 'ADMIN');

    if (isAdmin) {
      return this.techniciansService.findByIdAndAccount(id, accountId);
    } else {
      // return the current user's technician record
      if (!user.technicianId) {
        return null;
      }
      return this.techniciansService.findByIdAndAccount(user.technicianId, accountId);
    }
  }

  @Put(':id')
  @Roles('ADMIN') // Only users with ADMIN role can update technicians
  async update(
    @Param('id') id: string,
    @Body() updateTechnicianDto: UpdateTechnicianDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string
  ) {
    // Prepare technician data, excluding nested objects
    const { userAccount, ...technicianData } = updateTechnicianDto;
    const technicianUpdateData: Partial<Technician> & { address?: any; userAccount?: any } = {
      cpf: technicianData.cpf,
      phoneNumber: technicianData.phoneNumber,
      status: technicianData.status,
      updatedBy: userId,
      address: technicianData.address,
      // Convert string dates to Date objects if provided
      ...(technicianData.startDate && { startDate: new Date(technicianData.startDate) }),
      ...(technicianData.endDate && { endDate: new Date(technicianData.endDate) })
    };

    // Handle userAccount - force roles to be TECHNICIAN only
    const processedUserAccount = userAccount
      ? {
          ...userAccount,
          roles: ['TECHNICIAN'] // Always force TECHNICIAN role
        }
      : undefined;

    return this.techniciansService.update(id, accountId, technicianUpdateData, processedUserAccount);
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete technicians
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.techniciansService.delete(id, accountId);
  }
}
