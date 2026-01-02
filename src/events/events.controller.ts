import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Roles, GetAccount, GetUser } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) { }

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  async create(@Body() createEventDto: any, @GetAccount() accountId: string, @GetUser('id') userId: string) {
    // Override account with the one from JWT token
    createEventDto.account = accountId;
    createEventDto.createdBy = userId;
    createEventDto.updatedBy = userId;

    return this.eventsService.create(createEventDto);
  }

  @Get()
  async findAll(
    @GetAccount() accountId: string,
    @GetUser('technicianId') technicianId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string
  ) {
    return this.eventsService.findAll(accountId, {
      startDate,
      endDate,
      technicianId,
      customerId,
      status
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccount() accountId: string) {
    return this.eventsService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  async update(@Param('id') id: string, @Body() updateEventDto: any, @GetUser('id') userId: string, @GetAccount() accountId: string) {
    updateEventDto.updatedBy = userId;
    const result = await this.eventsService.updateByAccount(id, updateEventDto, accountId);

    if (!result) {
      return { message: 'Event not found' };
    }

    return result;
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async delete(@Param('id') id: string, @GetAccount() accountId: string) {
    const deleted = await this.eventsService.deleteByAccount(id, accountId);

    if (!deleted) {
      return { message: 'Event not found' };
    }

    return { message: 'Event deleted successfully' };
  }
}
