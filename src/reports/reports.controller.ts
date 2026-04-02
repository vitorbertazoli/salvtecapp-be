import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetMonthlyBalanceReportDto } from './dto/get-monthly-balance-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly-balance')
  async getMonthlyBalance(
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser() user: { roles?: string[]; isMasterAdmin?: boolean },
    @Query() query: GetMonthlyBalanceReportDto
  ) {
    const isAdmin = user.roles?.includes('ADMIN');
    const isMasterAdmin = !!user.isMasterAdmin;

    if (!isAdmin && !isMasterAdmin) {
      throw new ForbiddenException('auth.errors.accessDenied');
    }

    return this.reportsService.getMonthlyBalance(accountId, query);
  }
}
