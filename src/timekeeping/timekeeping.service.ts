import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { CreateTimekeepingEntryDto } from './dto/create-timekeeping-entry.dto';
import { TimekeepingQueryDto } from './dto/timekeeping-query.dto';
import { UpdateTimekeepingEntryDto } from './dto/update-timekeeping-entry.dto';
import { TimekeepingEntry, TimekeepingEntryDocument } from './schemas/timekeeping-entry.schema';

@Injectable()
export class TimekeepingService {
  constructor(
    @InjectModel(TimekeepingEntry.name) private readonly timekeepingModel: Model<TimekeepingEntryDocument>,
    private readonly usersService: UsersService
  ) {}

  async create(dto: CreateTimekeepingEntryDto, accountId: Types.ObjectId, userId: string, requesterRoles: string[] = []) {
    const isAdmin = requesterRoles.includes('ADMIN');
    const isSupervisor = requesterRoles.includes('SUPERVISOR');
    const isPrivileged = isAdmin || isSupervisor;

    const employeeId = isPrivileged ? dto.employee : userId;

    if (!isPrivileged && dto.employee !== userId) {
      throw new ForbiddenException('timekeeping.errors.technicianCanOnlyCreateOwn');
    }

    await this.ensureEmployeeExistsInAccount(employeeId, accountId);

    const payload = {
      employee: new Types.ObjectId(employeeId),
      date: this.normalizeDate(dto.date),
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      breakMinutes: dto.breakMinutes,
      workedMinutes: this.calculateWorkedMinutes(dto.checkIn, dto.checkOut, dto.breakMinutes),
      status: 'pending' as const,
      account: accountId,
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId)
    };

    const created = await this.timekeepingModel.create(payload);
    return this.findByIdAndAccount(created._id.toString(), accountId);
  }

  async findByAccount(accountId: Types.ObjectId, requesterId: string, requesterRoles: string[] = [], query: TimekeepingQueryDto) {
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const isAdmin = requesterRoles.includes('ADMIN');
    const isSupervisor = requesterRoles.includes('SUPERVISOR');
    const isPrivileged = isAdmin || isSupervisor;
    const match: any = { account: accountId };

    if (!isPrivileged) {
      match.employee = new Types.ObjectId(requesterId);
    }

    if (query.status) {
      match.status = query.status;
    }

    if (query.employeeId && isPrivileged) {
      match.employee = new Types.ObjectId(query.employeeId);
    }

    if (query.startDate || query.endDate) {
      match.date = {};
      if (query.startDate) {
        match.date.$gte = this.normalizeDate(query.startDate);
      }
      if (query.endDate) {
        match.date.$lte = this.normalizeDate(query.endDate);
      }
    }

    const [entries, total] = await Promise.all([
      this.timekeepingModel
        .find(match)
        .populate('employee', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.timekeepingModel.countDocuments(match)
    ]);

    return {
      entries,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    };
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('timekeeping.errors.notFound');
    }

    const entry = await this.timekeepingModel
      .findOne({ _id: new Types.ObjectId(id), account: accountId })
      .populate('employee', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .lean();

    if (!entry) {
      throw new NotFoundException('timekeeping.errors.notFound');
    }

    return entry;
  }

  async updateByAccount(id: string, dto: UpdateTimekeepingEntryDto, accountId: Types.ObjectId, requesterId: string, requesterRoles: string[] = []) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('timekeeping.errors.notFound');
    }

    const entry = await this.timekeepingModel.findOne({ _id: new Types.ObjectId(id), account: accountId });
    if (!entry) {
      throw new NotFoundException('timekeeping.errors.notFound');
    }

    const isAdmin = requesterRoles.includes('ADMIN');
    const isSupervisor = requesterRoles.includes('SUPERVISOR');
    const requesterObjectId = new Types.ObjectId(requesterId);

    if (!isAdmin) {
      if (entry.status !== 'pending') {
        throw new ForbiddenException('timekeeping.errors.cannotEditApproved');
      }

      if (!isSupervisor && !entry.employee.equals(requesterObjectId)) {
        throw new ForbiddenException('timekeeping.errors.onlyOwnEntries');
      }
    }

    if (dto.employee) {
      await this.ensureEmployeeExistsInAccount(dto.employee, accountId);
      entry.employee = new Types.ObjectId(dto.employee);
    }

    if (dto.date) {
      entry.date = this.normalizeDate(dto.date);
    }

    if (dto.checkIn) {
      entry.checkIn = dto.checkIn;
    }

    if (dto.checkOut) {
      entry.checkOut = dto.checkOut;
    }

    if (dto.breakMinutes !== undefined) {
      entry.breakMinutes = dto.breakMinutes;
    }

    entry.workedMinutes = this.calculateWorkedMinutes(entry.checkIn, entry.checkOut, entry.breakMinutes);
    entry.updatedBy = requesterObjectId;

    await entry.save();

    return this.findByIdAndAccount(id, accountId);
  }

  async approveByAccount(id: string, accountId: Types.ObjectId, userId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('timekeeping.errors.notFound');
    }

    const entry = await this.timekeepingModel.findOne({ _id: new Types.ObjectId(id), account: accountId });

    if (!entry) {
      throw new NotFoundException('timekeeping.errors.notFound');
    }

    if (entry.status === 'approved') {
      throw new BadRequestException('timekeeping.errors.alreadyApproved');
    }

    entry.status = 'approved';
    entry.approvedAt = new Date();
    entry.approvedBy = new Types.ObjectId(userId);
    entry.updatedBy = new Types.ObjectId(userId);

    await entry.save();

    return this.findByIdAndAccount(id, accountId);
  }

  async removeByAccount(id: string, accountId: Types.ObjectId, requesterId: string, requesterRoles: string[] = []) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('timekeeping.errors.notFound');
    }

    const entry = await this.timekeepingModel.findOne({ _id: new Types.ObjectId(id), account: accountId });

    if (!entry) {
      throw new NotFoundException('timekeeping.errors.notFound');
    }

    const isAdmin = requesterRoles.includes('ADMIN');
    const isSupervisor = requesterRoles.includes('SUPERVISOR');
    const requesterObjectId = new Types.ObjectId(requesterId);

    if (entry.status === 'approved' && !isAdmin) {
      throw new ForbiddenException('timekeeping.errors.cannotDeleteApproved');
    }

    if (!isAdmin && !isSupervisor && !entry.employee.equals(requesterObjectId)) {
      throw new ForbiddenException('timekeeping.errors.onlyOwnEntries');
    }

    await this.timekeepingModel.deleteOne({ _id: entry._id, account: accountId });

    return { id: entry._id.toString() };
  }

  async exportCsvByAccount(accountId: Types.ObjectId, requesterId: string, requesterRoles: string[] = [], query: TimekeepingQueryDto) {
    const result = await this.findByAccount(accountId, requesterId, requesterRoles, {
      ...query,
      page: 1,
      limit: 10000
    });

    const headers = ['Date', 'Employee', 'CheckIn', 'CheckOut', 'BreakMinutes', 'WorkedHours', 'Status', 'ApprovedBy', 'ApprovedAt'];
    const lines = result.entries.map((entry: any) => {
      const employeeName = `${entry.employee?.firstName || ''} ${entry.employee?.lastName || ''}`.trim();
      const approvedByName = `${entry.approvedBy?.firstName || ''} ${entry.approvedBy?.lastName || ''}`.trim();
      const workedHours = (entry.workedMinutes / 60).toFixed(2);
      const date = entry.date ? new Date(entry.date).toISOString().slice(0, 10) : '';
      const approvedAt = entry.approvedAt ? new Date(entry.approvedAt).toISOString() : '';

      return [date, employeeName, entry.checkIn, entry.checkOut, entry.breakMinutes, workedHours, entry.status, approvedByName, approvedAt]
        .map((field) => `"${String(field ?? '').replace(/"/g, '""')}"`)
        .join(',');
    });

    return [headers.join(','), ...lines].join('\n');
  }

  async deleteAllByAccount(accountId: Types.ObjectId) {
    return this.timekeepingModel.deleteMany({ account: accountId }).exec();
  }

  async listEmployeesByAccount(accountId: Types.ObjectId, requesterId: string, requesterRoles: string[] = []) {
    const isAdmin = requesterRoles.includes('ADMIN');
    const isSupervisor = requesterRoles.includes('SUPERVISOR');

    if (!isAdmin && !isSupervisor) {
      const user = await this.usersService.findByIdAndAccount(requesterId, accountId);
      if (!user) {
        throw new NotFoundException('timekeeping.errors.employeeNotFound');
      }

      return [
        {
          _id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        }
      ];
    }

    const usersResult = await this.usersService.findByAccount(accountId, 1, 500, '');
    return usersResult.users.map((user: any) => ({
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    }));
  }

  private calculateWorkedMinutes(checkIn: string, checkOut: string, breakMinutes: number): number {
    const checkInMinutes = this.timeStringToMinutes(checkIn);
    const checkOutMinutes = this.timeStringToMinutes(checkOut);

    if (checkOutMinutes <= checkInMinutes) {
      throw new BadRequestException('timekeeping.errors.invalidTimeRange');
    }

    const worked = checkOutMinutes - checkInMinutes - breakMinutes;

    if (worked < 0) {
      throw new BadRequestException('timekeeping.errors.invalidBreakMinutes');
    }

    return worked;
  }

  private timeStringToMinutes(value: string): number {
    const [hour, minute] = value.split(':').map((part) => Number(part));
    return hour * 60 + minute;
  }

  private normalizeDate(value: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('timekeeping.errors.invalidDate');
    }

    return date;
  }

  private async ensureEmployeeExistsInAccount(userId: string, accountId: Types.ObjectId) {
    const user = await this.usersService.findByIdAndAccount(userId, accountId);

    if (!user) {
      throw new NotFoundException('timekeeping.errors.employeeNotFound');
    }
  }
}
