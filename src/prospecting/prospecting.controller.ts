import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProspectCallDto } from './dto/create-prospect-call.dto';
import { ProspectStatusesDto } from './dto/prospect-statuses.dto';
import { UpsertProspectBusinessDto } from './dto/upsert-prospect-business.dto';
import { ProspectingService } from './prospecting.service';

@Controller('prospecting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProspectingController {
  constructor(private readonly prospectingService: ProspectingService) {}

  @Post('businesses/upsert')
  @Roles('ADMIN', 'SUPERVISOR') // Only ADMIN and SUPERVISOR can upsert businesses
  async upsertBusiness(@Body() dto: UpsertProspectBusinessDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.prospectingService.upsertBusiness(dto, accountId, userId);
  }

  @Post('businesses/statuses')
  @Roles('ADMIN', 'SUPERVISOR') // Only ADMIN and SUPERVISOR can get business statuses
  async getStatuses(@Body() dto: ProspectStatusesDto, @GetAccountId() accountId: Types.ObjectId) {
    return this.prospectingService.getBusinessStatusesByPlaceIds(dto.placeIds, accountId);
  }

  @Get('businesses/:id/calls')
  @Roles('ADMIN', 'SUPERVISOR') // Only ADMIN and SUPERVISOR can get business calls
  async getBusinessCalls(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.prospectingService.getBusinessCallLogs(id, accountId);
  }

  @Post('businesses/:id/calls')
  @Roles('ADMIN', 'SUPERVISOR') // Only ADMIN and SUPERVISOR can create business calls
  async createCall(@Param('id') id: string, @Body() dto: CreateProspectCallDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.prospectingService.createCallLog(id, dto, accountId, userId);
  }
}
