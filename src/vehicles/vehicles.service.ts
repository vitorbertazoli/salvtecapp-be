import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VehicleUsage, VehicleUsageDocument } from '../vehicle-usages/schemas/vehicle-usages.schema';
import { Vehicle, VehicleDocument } from './schemas/vehicles.schema';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    @InjectModel(VehicleUsage.name) private vehicleUsageModel: Model<VehicleUsageDocument>
  ) {}

  async create(createVehicleDto: Partial<Vehicle>): Promise<Vehicle> {
    const createdVehicle = new this.vehicleModel(createVehicleDto);
    return createdVehicle.save();
  }

  async findAll(
    accountId?: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    isActive?: boolean
  ): Promise<{
    vehicles: Vehicle[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { account: accountId };

    // Filter by isActive if specified
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { licensePlate: { $regex: search, $options: 'i' } },
        { make: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    const [vehicles, total] = await Promise.all([this.vehicleModel.find(query).skip(skip).limit(limit).exec(), this.vehicleModel.countDocuments(query)]);

    const totalPages = Math.ceil(total / limit);

    return {
      vehicles,
      total,
      page,
      limit,
      totalPages
    };
  }

  async findOne(id: string, accountId: Types.ObjectId): Promise<Vehicle | null> {
    const query = { _id: id, account: accountId };
    return this.vehicleModel.findOne(query).exec();
  }

  async update(id: string, updateVehicleDto: Partial<Vehicle>, accountId: Types.ObjectId): Promise<Vehicle | null> {
    const query = { _id: id, account: accountId };
    return this.vehicleModel.findOneAndUpdate(query, updateVehicleDto, { new: true }).exec();
  }

  async remove(id: string, accountId: Types.ObjectId): Promise<{ vehicle: Vehicle | null; deleted: boolean }> {
    const query = { _id: id, account: accountId };

    // Check if there are any vehicle usages for this vehicle
    const usageCount = await this.vehicleUsageModel.countDocuments({ vehicle: id, account: accountId });

    if (usageCount > 0) {
      // If there are usages, just set to inactive
      const vehicle = await this.vehicleModel.findOneAndUpdate(query, { isActive: false }, { new: true }).exec();
      return { vehicle, deleted: false };
    } else {
      // If no usages, actually delete the vehicle
      const vehicle = await this.vehicleModel.findOneAndDelete(query).exec();
      return { vehicle, deleted: true };
    }
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.vehicleModel.deleteMany({ account: accountId }).exec();
  }
}
