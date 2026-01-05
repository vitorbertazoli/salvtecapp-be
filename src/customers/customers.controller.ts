import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Roles, GetAccount, GetUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create customers
  async create(@Body() createCustomerDto: any, @GetUser('id') userId: string, @GetAccount() accountId: string) {
    // Override account with the one from JWT token
    createCustomerDto.account = accountId;
    createCustomerDto.createdBy = userId;
    createCustomerDto.updatedBy = userId;

    return this.customersService.create(createCustomerDto);
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

    // All authenticated users can see customers in their account
    return this.customersService.findByAccount(accountId, pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccount() accountId: string) {
    return this.customersService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can update customers
  async update(@Param('id') id: string, @Body() updateCustomerDto: any, @GetUser('id') userId: string, @GetAccount() accountId: string) {
    updateCustomerDto.updatedBy = userId;
    return this.customersService.updateByAccount(id, updateCustomerDto, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete customers
  remove(@Param('id') id: string, @GetAccount() accountId: string) {
    return this.customersService.deleteByAccount(id, accountId);
  }
}
