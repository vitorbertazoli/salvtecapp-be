import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';
import { Expense } from './schemas/expense.schema';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  async create(@Body() createExpenseDto: CreateExpenseDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string): Promise<Expense> {
    return this.expensesService.create(createExpenseDto, accountId, new Types.ObjectId(userId));
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR')
  async findAll(
    @GetAccountId() accountId: Types.ObjectId,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser('id') userId?: string,
    @GetUser('roles') userRoles: string[] = []
  ): Promise<{ data: Expense[]; total: number }> {
    const createdByFilter = this.isSupervisorRestricted(userRoles) && userId ? new Types.ObjectId(userId) : undefined;
    return this.expensesService.findAll(accountId, page, limit, search, category, startDate, endDate, createdByFilter);
  }

  @Get('stats')
  @Roles('ADMIN', 'SUPERVISOR')
  async getStats(
    @GetAccountId() accountId: Types.ObjectId,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @GetUser('id') userId?: string,
    @GetUser('roles') userRoles: string[] = []
  ): Promise<{
    totalExpenses: number;
    categoryBreakdown: { category: string; total: number; count: number }[];
    monthlyBreakdown: { month: string; total: number; count: number }[];
  }> {
    const createdByFilter = this.isSupervisorRestricted(userRoles) && userId ? new Types.ObjectId(userId) : undefined;
    return this.expensesService.getExpenseStats(accountId, startDate, endDate, createdByFilter);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async findOne(
    @Param('id') id: string,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId?: string,
    @GetUser('roles') userRoles: string[] = []
  ): Promise<Expense> {
    const createdByFilter = this.isSupervisorRestricted(userRoles) && userId ? new Types.ObjectId(userId) : undefined;
    return this.expensesService.findOne(id, accountId, createdByFilter);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string,
    @GetUser('roles') userRoles: string[] = []
  ): Promise<Expense> {
    const createdByFilter = this.isSupervisorRestricted(userRoles) ? new Types.ObjectId(userId) : undefined;
    return this.expensesService.update(id, updateExpenseDto, accountId, new Types.ObjectId(userId), createdByFilter);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async remove(
    @Param('id') id: string,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId?: string,
    @GetUser('roles') userRoles: string[] = []
  ): Promise<{ message: string }> {
    const createdByFilter = this.isSupervisorRestricted(userRoles) && userId ? new Types.ObjectId(userId) : undefined;
    await this.expensesService.remove(id, accountId, createdByFilter);
    return { message: 'Expense deleted successfully' };
  }

  private isSupervisorRestricted(userRoles: string[] = []): boolean {
    return userRoles.includes('SUPERVISOR') && !userRoles.includes('ADMIN');
  }
}
