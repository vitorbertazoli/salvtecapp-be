import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { FollowUpsService } from './follow-ups.service';

@Controller('follow-ups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  async create(@Body() dto: CreateFollowUpDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const followUpData = {
      ...dto,
      account: accountId,
      customer: new Types.ObjectId(dto.customer),
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.followUpsService.create(followUpData);
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @Query('customerId') customerId: string = '',
    @Query('startDate') startDate: string = '',
    @Query('endDate') endDate: string = '',
    @GetAccountId() accountId: Types.ObjectId
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.followUpsService.findByAccount(accountId, pageNum, limitNum, search, status || undefined, customerId || undefined, startDateObj, endDateObj);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.followUpsService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(@Param('id') id: string, @Body() dto: UpdateFollowUpDto, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const followUpData = {
      ...dto,
      updatedBy: new Types.ObjectId(userId)
    } as any;

    // Handle status changes for completion tracking
    if (dto.status === 'completed') {
      followUpData.completedAt = new Date();
      followUpData.completedBy = new Types.ObjectId(userId);
    } else if (dto.status === 'pending') {
      followUpData.completedAt = undefined;
      followUpData.completedBy = undefined;
    }

    return this.followUpsService.updateByAccount(id, followUpData, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async delete(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.followUpsService.deleteByAccount(id, accountId);
  }
}
