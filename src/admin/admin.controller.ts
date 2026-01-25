import { BadRequestException, Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';
import { MasterAdminGuard } from './guards/master-admin.guard';

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
  async updateAccountStatus(@Param('id') accountId: string, @Body() updateAccountStatusDto: UpdateAccountStatusDto) {
    return this.adminService.updateAccountStatus(accountId, updateAccountStatusDto.status);
  }

  @Delete('accounts/:id')
  async deleteAccount(@Param('id') accountId: Types.ObjectId, @GetAccountId() currentUserAccount: string) {
    if (currentUserAccount === accountId.toString()) {
      throw new BadRequestException('admin.errors.cannotDeleteOwnAccount');
    }
    return this.adminService.deleteAccount(accountId);
  }
}
