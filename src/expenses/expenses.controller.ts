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
  @Roles('ADMIN')
  async create(@Body() createExpenseDto: CreateExpenseDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string): Promise<Expense> {
    return this.expensesService.create(createExpenseDto, accountId, new Types.ObjectId(userId));
  }

  @Get()
  @Roles('ADMIN')
  async findAll(
    @GetAccountId() accountId: Types.ObjectId,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<{ data: Expense[]; total: number }> {
    return this.expensesService.findAll(accountId, page, limit, search, category, startDate, endDate);
  }

  @Get('stats')
  @Roles('ADMIN')
  async getStats(
    @GetAccountId() accountId: Types.ObjectId,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<{
    totalExpenses: number;
    categoryBreakdown: { category: string; total: number; count: number }[];
    monthlyBreakdown: { month: string; total: number; count: number }[];
  }> {
    return this.expensesService.getExpenseStats(accountId, startDate, endDate);
  }

  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId): Promise<Expense> {
    return this.expensesService.findOne(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string
  ): Promise<Expense> {
    return this.expensesService.update(id, updateExpenseDto, accountId, new Types.ObjectId(userId));
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId): Promise<void> {
    return this.expensesService.remove(id, accountId);
  }
}
