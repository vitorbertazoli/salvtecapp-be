import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetAccountId, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import { Types } from 'mongoose';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create customers
  async getStats(@GetAccountId() accountId: Types.ObjectId) {
    return this.dashboardService.getStats(accountId);
  }
}
