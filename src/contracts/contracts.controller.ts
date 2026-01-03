import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Roles, GetAccount, GetUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContractsService } from './contracts.service';

@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractsController {
    constructor(private readonly contractsService: ContractsService) { }

    @Post()
    @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create contracts
    async create(@Body() createContractDto: any, @GetUser('id') userId: string, @GetAccount() accountId: string) {
        // Override account with the one from JWT token
        createContractDto.account = accountId;
        createContractDto.createdBy = userId;
        createContractDto.updatedBy = userId;

        return this.contractsService.create(createContractDto);
    }

    @Get()
    @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create contracts
    async findAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('search') search: string = '',
        @Query('status') status: string = '',
        @GetAccount() accountId: string
    ) {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;

        // All authenticated users can see contracts in their account
        return this.contractsService.findByAccount(accountId, pageNum, limitNum, search, status || undefined);
    }

    @Get(':id')
    @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can create contracts
    async findOne(@Param('id') id: string, @GetAccount() accountId: string) {
        return this.contractsService.findByIdAndAccount(id, accountId);
    }

    @Put(':id')
    @Roles('ADMIN', 'SUPERVISOR') // ADMIN and SUPERVISOR can update contracts
    async update(@Param('id') id: string, @Body() updateContractDto: any, @GetUser('id') userId: string, @GetAccount() accountId: string) {
        updateContractDto.updatedBy = userId;
        return this.contractsService.updateByAccount(id, updateContractDto, accountId);
    }

    @Delete(':id')
    @Roles('ADMIN') // Only users with ADMIN role can delete contracts
    remove(@Param('id') id: string, @GetAccount() accountId: string) {
        return this.contractsService.deleteByAccount(id, accountId);
    }
}