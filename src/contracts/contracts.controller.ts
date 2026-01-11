import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create contracts
  async create(@Body() dto: CreateContractDto, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const contractData = {
      ...dto,
      account: accountId,
      customer: new Types.ObjectId(dto.customer),
      createdBy: userId,
      updatedBy: userId
    } as any;

    return this.contractsService.create(contractData);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create contracts
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @GetAccountId() accountId: Types.ObjectId
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // All authenticated users can see contracts in their account
    return this.contractsService.findByAccount(accountId, pageNum, limitNum, search, status || undefined);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create contracts
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.contractsService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can update contracts
  async update(@Param('id') id: string, @Body() dto: UpdateContractDto, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const contractData = {
      ...dto,
      ...(dto.customer && { customer: new Types.ObjectId(dto.customer) }),
      updatedBy: userId
    } as any;

    return this.contractsService.updateByAccount(id, contractData, accountId);
  }

  @Delete(':id')
  @Roles('ADMIN') // Only users with ADMIN role can delete contracts
  remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.contractsService.deleteByAccount(id, accountId);
  }
}
