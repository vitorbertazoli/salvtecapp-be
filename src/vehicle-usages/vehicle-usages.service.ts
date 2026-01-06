import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehicleUsage, VehicleUsageDocument } from './schemas/vehicle-usages.schema';

@Injectable()
export class VehicleUsagesService {
  constructor(@InjectModel(VehicleUsage.name) private vehicleUsageModel: Model<VehicleUsageDocument>) {}

  async create(createDto: Partial<VehicleUsage>): Promise<VehicleUsage> {
    const created = new this.vehicleUsageModel(createDto);
    return created.save();
  }

  async findAll(accountId?: string): Promise<VehicleUsage[]> {
    const query = accountId ? { account: accountId } : {};
    return this.vehicleUsageModel
      .find(query)
      .populate({
        path: 'technician',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .populate('vehicle', 'name licensePlate')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, accountId?: string): Promise<VehicleUsage | null> {
    const query = accountId ? { _id: id, account: accountId } : { _id: id };
    return this.vehicleUsageModel
      .findOne(query)
      .populate({
        path: 'technician',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })
      .populate('vehicle', 'name licensePlate')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .exec();
  }

  async update(id: string, updateDto: Partial<VehicleUsage>, accountId?: string): Promise<VehicleUsage | null> {
    const query = accountId ? { _id: id, account: accountId } : { _id: id };
    const existing = await this.vehicleUsageModel.findOne(query);
    if (!existing) throw new ForbiddenException('Vehicle usage not found');

    if (existing.status === 'approved') {
      throw new ForbiddenException('Cannot edit approved entries');
    }

    return this.vehicleUsageModel.findOneAndUpdate(query, updateDto, { new: true }).exec();
  }

  async approve(id: string, userId: string): Promise<VehicleUsage | null> {
    const existing = await this.vehicleUsageModel.findById(id);
    if (!existing) throw new ForbiddenException('Vehicle usage not found');

    if (existing.status === 'approved') {
      throw new ForbiddenException('Already approved');
    }

    return this.vehicleUsageModel.findByIdAndUpdate(id, { status: 'approved', approvedBy: userId, approvedAt: new Date() }, { new: true }).exec();
  }

  async remove(id: string, accountId?: string): Promise<VehicleUsage | null> {
    const query = accountId ? { _id: id, account: accountId } : { _id: id };
    const existing = await this.vehicleUsageModel.findOne(query);
    if (!existing) throw new ForbiddenException('Vehicle usage not found');

    if (existing.status === 'approved') {
      throw new ForbiddenException('Cannot delete approved entries');
    }

    return this.vehicleUsageModel.findOneAndDelete(query).exec();
  }
}
