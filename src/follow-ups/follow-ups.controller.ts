import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Roles, GetAccount, GetUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FollowUpsService } from './follow-ups.service';

@Controller('follow-ups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) { }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  async create(@Body() createFollowUpDto: any, @GetAccount() accountId: string, @GetUser('id') userId: string) {
    // Override account with the one from JWT token
    createFollowUpDto.account = accountId;
    createFollowUpDto.createdBy = userId;
    createFollowUpDto.updatedBy = userId;

    return this.followUpsService.create(createFollowUpDto);
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
    @GetAccount() accountId: string
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.followUpsService.findByAccount(
      accountId,
      pageNum,
      limitNum,
      search,
      status || undefined,
      customerId || undefined,
      startDateObj,
      endDateObj
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccount() accountId: string) {
    return this.followUpsService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(@Param('id') id: string, @Body() updateFollowUpDto: any, @GetUser('id') userId: string, @GetAccount() accountId: string) {
    updateFollowUpDto.updatedBy = userId;

    // Handle status changes for completion tracking
    if (updateFollowUpDto.status === 'completed') {
      updateFollowUpDto.completedAt = new Date();
      updateFollowUpDto.completedBy = userId;
    } else if (updateFollowUpDto.status === 'pending') {
      updateFollowUpDto.completedAt = undefined;
      updateFollowUpDto.completedBy = undefined;
    }

    return this.followUpsService.updateByAccount(id, updateFollowUpDto, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async delete(@Param('id') id: string, @GetAccount() accountId: string) {
    return this.followUpsService.deleteByAccount(id, accountId);
  }
}
