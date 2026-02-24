import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CompleteEventDto } from './dto/complete-event.dto';
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
    const eventData: any = {
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      customer: new Types.ObjectId(dto.customer),
      technician: dto.technician.map((id) => new Types.ObjectId(id)),
      account: accountId,
      ...(dto.title && { title: dto.title }),
      ...(dto.description && { description: dto.description }),
      ...(dto.status && { status: dto.status }),
      ...(dto.serviceOrder && { serviceOrder: new Types.ObjectId(dto.serviceOrder) }),
      ...(dto.recurringConfig && { recurringConfig: dto.recurringConfig }),
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId)
    };

    return this.eventsService.create(eventData, accountId);
  }

  @Get()
  async findAll(
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('technicianId') technicianId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @GetUser('roles') roles?: string[]
  ) {
    // isAdmin
    const isAdmin = roles?.includes('ADMIN') || roles?.includes('SUPERVISOR');
    return this.eventsService.findAll(accountId, {
      startDate,
      endDate,
      technicianId: isAdmin ? undefined : technicianId,
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
    const eventData: any = {
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      customer: new Types.ObjectId(dto.customer),
      technician: dto.technician.map((id) => new Types.ObjectId(id)),
      updatedBy: new Types.ObjectId(userId)
    };

    if (dto.title !== undefined) eventData.title = dto.title;
    if (dto.description !== undefined) eventData.description = dto.description;
    if (dto.status !== undefined) eventData.status = dto.status;
    if (dto.completionNotes !== undefined) eventData.completionNotes = dto.completionNotes;
    if (dto.serviceOrder !== undefined) eventData.serviceOrder = new Types.ObjectId(dto.serviceOrder);
    if (dto.recurringConfigId !== undefined) eventData.recurringConfig = new Types.ObjectId(dto.recurringConfigId);
    if (dto.recurringUpdate !== undefined) eventData.recurringUpdate = dto.recurringUpdate;

    const result = await this.eventsService.updateByAccount(id, eventData, accountId);

    if (!result) {
      return { message: 'Event not found' };
    }

    return result;
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async delete(@Param('id') id: string, @Query('scope') scope: 'single' | 'future' | 'all' = 'single', @GetAccountId() accountId: Types.ObjectId) {
    const result = await this.eventsService.deleteByAccount(id, accountId, scope);

    if (!result.deleted) {
      return { message: 'Event not found' };
    }

    return {
      message: 'Event deleted successfully',
      deletedCount: result.deletedCount,
      scope
    };
  }

  @Patch(':id/complete')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  async complete(@Param('id') id: string, @Body() dto: CompleteEventDto, @GetUser('id') userId: string, @GetAccountId() accountId: Types.ObjectId) {
    const result = await this.eventsService.completeByAccount(id, new Types.ObjectId(userId), accountId, dto.notes, dto.completeServiceOrder);
    return result;
  }
}
