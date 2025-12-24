import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FollowUpsService } from './follow-ups.service';

@Controller('follow-ups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  async create(@Body() createFollowUpDto: any, @Request() req: any) {
    // Override account with the one from JWT token
    createFollowUpDto.account = req.user.account;
    createFollowUpDto.createdBy = req.user.id;
    createFollowUpDto.updatedBy = req.user.id;

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
    @Request() req: any
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.followUpsService.findByAccount(
      req.user.account.toString(),
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
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.followUpsService.findByIdAndAccount(id, req.user.account.toString());
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(@Param('id') id: string, @Body() updateFollowUpDto: any, @Request() req: any) {
    updateFollowUpDto.updatedBy = req.user.id;

    // Handle status changes for completion tracking
    if (updateFollowUpDto.status === 'completed') {
      updateFollowUpDto.completedAt = new Date();
      updateFollowUpDto.completedBy = req.user.id;
    } else if (updateFollowUpDto.status === 'pending') {
      updateFollowUpDto.completedAt = undefined;
      updateFollowUpDto.completedBy = undefined;
    }

    return this.followUpsService.updateByAccount(id, updateFollowUpDto, req.user.account.toString());
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.followUpsService.deleteByAccount(id, req.user.account.toString());
  }
}
