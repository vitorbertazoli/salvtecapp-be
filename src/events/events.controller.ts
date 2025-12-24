import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  async create(@Body() createEventDto: any, @Request() req: any) {
    // Override account with the one from JWT token
    createEventDto.account = req.user.account;
    createEventDto.createdBy = req.user.id;
    createEventDto.updatedBy = req.user.id;

    return this.eventsService.create(createEventDto);
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('technicianId') technicianId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string
  ) {
    return this.eventsService.findAll(req.user.account.toString(), {
      startDate,
      endDate,
      technicianId,
      customerId,
      status
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.eventsService.findByIdAndAccount(id, req.user.account.toString());
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  async update(@Param('id') id: string, @Body() updateEventDto: any, @Request() req: any) {
    updateEventDto.updatedBy = req.user.id;
    const result = await this.eventsService.updateByAccount(id, updateEventDto, req.user.account.toString());

    if (!result) {
      return { message: 'Event not found' };
    }

    return result;
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async delete(@Param('id') id: string, @Request() req: any) {
    const deleted = await this.eventsService.deleteByAccount(id, req.user.account.toString());

    if (!deleted) {
      return { message: 'Event not found' };
    }

    return { message: 'Event deleted successfully' };
  }
}
