import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QuotesService } from './quotes.service';

@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN') // Multiple roles can create quotes
  async create(@Body() createQuoteDto: any, @Request() req: any) {
    // Override account with the one from JWT token
    createQuoteDto.account = req.user.account;
    createQuoteDto.createdBy = req.user.id;
    createQuoteDto.updatedBy = req.user.id;

    return this.quotesService.create(createQuoteDto);
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @Request() req: any
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // All authenticated users can see quotes in their account
    return this.quotesService.findByAccount(req.user.account.toString(), pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.quotesService.findByIdAndAccount(id, req.user.account.toString());
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN') // Multiple roles can update quotes
  async update(@Param('id') id: string, @Body() updateQuoteDto: any, @Request() req: any) {
    updateQuoteDto.updatedBy = req.user.id;
    return this.quotesService.updateByAccount(id, updateQuoteDto, req.user.account.toString());
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR') // Only ADMIN and SUPERVISOR can delete quotes
  remove(@Param('id') id: string, @Request() req: any) {
    return this.quotesService.deleteByAccount(id, req.user.account.toString());
  }
}
