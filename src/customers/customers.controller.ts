import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create customers
  async create(@Body() createCustomerDto: any, @Request() req: any) {
    // Override account with the one from JWT token
    createCustomerDto.account = req.user.account;
    createCustomerDto.createdBy = req.user.id;
    createCustomerDto.updatedBy = req.user.id;

    return this.customersService.create(createCustomerDto);
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

    // All authenticated users can see customers in their account
    return this.customersService.findByAccount(req.user.account.toString(), pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.customersService.findByIdAndAccount(id, req.user.account.toString());
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can update customers
  async update(@Param('id') id: string, @Body() updateCustomerDto: any, @Request() req: any) {
    updateCustomerDto.updatedBy = req.user.id;
    return this.customersService.updateByAccount(id, updateCustomerDto, req.user.account.toString());
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete customers
  remove(@Param('id') id: string, @Request() req: any) {
    return this.customersService.deleteByAccount(id, req.user.account.toString());
  }
}
