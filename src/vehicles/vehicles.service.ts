import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vehicle, VehicleDocument } from './schemas/vehicles.schema';

@Injectable()
export class VehiclesService {
  constructor(@InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>) {}

  async create(createVehicleDto: Partial<Vehicle>): Promise<Vehicle> {
    const createdVehicle = new this.vehicleModel(createVehicleDto);
    return createdVehicle.save();
  }

  async findAll(
    accountId?: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = ''
  ): Promise<{
    vehicles: Vehicle[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { account: accountId, isActive: true };

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

  async remove(id: string, accountId: Types.ObjectId): Promise<Vehicle | null> {
    const query = { _id: id, account: accountId };
    return this.vehicleModel.findOneAndUpdate(query, { isActive: false }, { new: true }).exec();
  }
}
