import { Controller, Get, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GetAccount } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MasterAdminGuard } from './guards/master-admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, MasterAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('accounts')
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10', @Query('search') search: string = '') {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    return this.adminService.getAllAccounts(pageNum, limitNum, search);
  }

  @Put('accounts/:id/status')
  async updateAccountStatus(@Param('id') accountId: string, @Body() body: { status: 'pending' | 'active' | 'suspended' }) {
    return this.adminService.updateAccountStatus(accountId, body.status);
  }

  @Delete('accounts/:id')
  async deleteAccount(@Param('id') accountId: string, @GetAccount() currentUserAccount: string) {
    if (currentUserAccount === accountId) {
      throw new Error('You cannot delete your own account while logged in.');
    }
    return this.adminService.deleteAccount(accountId);
  }
}
