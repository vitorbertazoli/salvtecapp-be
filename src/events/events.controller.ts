import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  async create(@Body() dto: CreateEventDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const eventData = {
      ...dto,
      account: accountId,
      customer: new Types.ObjectId(dto.customer),
      technician: new Types.ObjectId(dto.technician),
      ...(dto.serviceOrder && { serviceOrder: new Types.ObjectId(dto.serviceOrder) }),
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.eventsService.create(eventData, accountId);
  }

  @Get()
  async findAll(
    @GetAccountId() accountId: Types.ObjectId,
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

  @Get('/paginated')
  async findAllPaginated(
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('page') page: string,
    @Query('limit') limit?: string,
    @Query('customer') customerId?: string
  ) {
    return this.eventsService.findAllPaginated(accountId, page, limit, customerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.eventsService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const eventData = {
      ...dto,
      ...(dto.customer && { customer: new Types.ObjectId(dto.customer) }),
      ...(dto.technician && { technician: new Types.ObjectId(dto.technician) }),
      ...(dto.serviceOrder && { serviceOrder: new Types.ObjectId(dto.serviceOrder) }),
      updatedBy: new Types.ObjectId(userId)
    } as any;

    const result = await this.eventsService.updateByAccount(id, eventData, accountId);

    if (!result) {
      return { message: 'Event not found' };
    }

    return result;
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async delete(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    const deleted = await this.eventsService.deleteByAccount(id, accountId);

    if (!deleted) {
      return { message: 'Event not found' };
    }

    return { message: 'Event deleted successfully' };
  }

  @Patch(':id/complete')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  async complete(@Param('id') id: string, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const result = await this.eventsService.completeByAccount(id, new Types.ObjectId(userId), accountId);

    if (!result) {
      return { message: 'Event not found' };
    }

    return result;
  }
}