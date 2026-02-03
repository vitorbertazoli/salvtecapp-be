import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create customers
  async getStats(@GetAccountId() accountId: Types.ObjectId, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.dashboardService.getStats(accountId, startDate, endDate);
  }
}
