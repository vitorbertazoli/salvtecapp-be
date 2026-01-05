import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Roles, GetAccount, GetUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QuotesService } from './quotes.service';

@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN') // Multiple roles can create quotes
  async create(@Body() createQuoteDto: any, @GetAccount() accountId: any, @GetUser('id') userId: string) {
    // Override account with the one from JWT token
    createQuoteDto.account = accountId;
    createQuoteDto.createdBy = userId;
    createQuoteDto.updatedBy = userId;

    return this.quotesService.create(createQuoteDto);
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @GetAccount() accountId: string
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // All authenticated users can see quotes in their account
    return this.quotesService.findByAccount(accountId, pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccount() accountId: any) {
    return this.quotesService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN') // Multiple roles can update quotes
  async update(@Param('id') id: string, @Body() updateQuoteDto: any, @GetAccount() accountId: any, @GetUser('id') userId: string) {
    updateQuoteDto.updatedBy = userId;
    return this.quotesService.updateByAccount(id, updateQuoteDto, accountId);
  }

  @Put(':id/send')
  @Roles('ADMIN', 'SUPERVISOR')
  async send(@Param('id') id: string, @GetAccount() accountId: any, @GetUser('id') userId: string) {
    return this.quotesService.sendQuote(id, accountId, userId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR') // Only ADMIN and SUPERVISOR can delete quotes
  remove(@Param('id') id: string, @GetAccount() accountId: string) {
    return this.quotesService.deleteByAccount(id, accountId);
  }
}
