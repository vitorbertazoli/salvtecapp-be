import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTimekeepingEntryDto } from './dto/create-timekeeping-entry.dto';
import { TimekeepingQueryDto } from './dto/timekeeping-query.dto';
import { UpdateTimekeepingEntryDto } from './dto/update-timekeeping-entry.dto';
import { TimekeepingService } from './timekeeping.service';

@Controller('timekeeping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimekeepingController {
  constructor(private readonly timekeepingService: TimekeepingService) {}

  @Post()
  @Roles('TECHNICIAN', 'SUPERVISOR', 'ADMIN')
  async create(
    @Body() dto: CreateTimekeepingEntryDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string,
    @GetUser('roles') roles: string[]
  ) {
    return this.timekeepingService.create(dto, accountId, userId, roles);
  }

  @Get('employees')
  @Roles('TECHNICIAN', 'SUPERVISOR', 'ADMIN')
  async listEmployees(@GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string, @GetUser('roles') roles: string[]) {
    return this.timekeepingService.listEmployeesByAccount(accountId, userId, roles);
  }

  @Get()
  @Roles('TECHNICIAN', 'SUPERVISOR', 'ADMIN')
  async findAll(
    @Query() query: TimekeepingQueryDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string,
    @GetUser('roles') roles: string[]
  ) {
    return this.timekeepingService.findByAccount(accountId, userId, roles, query);
  }

  @Get('export/csv')
  @Roles('ADMIN')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Query() query: TimekeepingQueryDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string,
    @GetUser('roles') roles: string[]
  ) {
    return this.timekeepingService.exportCsvByAccount(accountId, userId, roles, query);
  }

  @Get(':id')
  @Roles('TECHNICIAN', 'SUPERVISOR', 'ADMIN')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.timekeepingService.findByIdAndAccount(id, accountId);
  }

  @Patch(':id')
  @Roles('TECHNICIAN', 'SUPERVISOR', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTimekeepingEntryDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string,
    @GetUser('roles') roles: string[]
  ) {
    return this.timekeepingService.updateByAccount(id, dto, accountId, userId, roles);
  }

  @Post(':id/approve')
  @Roles('ADMIN')
  async approve(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.timekeepingService.approveByAccount(id, accountId, userId);
  }

  @Delete(':id')
  @Roles('TECHNICIAN', 'SUPERVISOR', 'ADMIN')
  async remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId, @GetUser('roles') roles: string[], @GetUser('id') userId: string) {
    return this.timekeepingService.removeByAccount(id, accountId, userId, roles);
  }
}
