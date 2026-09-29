import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomersService } from '../customers/customers.service';
import { CustomerVehicle, CustomerVehicleDocument } from './schemas/customer-vehicle.schema';

@Injectable()
export class CustomerVehiclesService {
  constructor(
    @InjectModel(CustomerVehicle.name) private readonly customerVehicleModel: Model<CustomerVehicleDocument>,
    private readonly customersService: CustomersService
  ) {}

  async create(data: Partial<CustomerVehicle> & { customer: Types.ObjectId }, accountId: Types.ObjectId): Promise<CustomerVehicle> {
    const customer = await this.customersService.findByIdAndAccount(data.customer.toString(), accountId);
    if (!customer) {
      throw new NotFoundException('customerVehicles.errors.customerNotFound');
    }

    return new this.customerVehicleModel({ ...data, account: accountId }).save();
  }

  async findByAccount(accountId: Types.ObjectId, customerId?: string, search = ''): Promise<CustomerVehicle[]> {
    const query: Record<string, any> = { account: accountId };
    if (customerId && Types.ObjectId.isValid(customerId)) {
      query.customer = new Types.ObjectId(customerId);
    }
    if (search) {
      query.$or = [
        { make: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { year: Number.isNaN(Number(search)) ? undefined : Number(search) }
      ].filter((condition) => Object.values(condition)[0] !== undefined);
    }

    return this.customerVehicleModel.find(query).populate('customer', 'name').sort({ createdAt: -1 }).exec();
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<CustomerVehicleDocument | null> {
    return this.customerVehicleModel.findOne({ _id: id, account: accountId }).exec();
  }

  async updateByAccount(id: string, data: Partial<CustomerVehicle>, accountId: Types.ObjectId, userId: Types.ObjectId) {
    const updated = await this.customerVehicleModel
      .findOneAndUpdate({ _id: id, account: accountId }, { ...data, updatedBy: userId }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('customerVehicles.errors.vehicleNotFound');
    }
    return updated;
  }

  async deleteByAccount(id: string, accountId: Types.ObjectId) {
    const deleted = await this.customerVehicleModel.findOneAndDelete({ _id: id, account: accountId }).exec();
    if (!deleted) {
      throw new NotFoundException('customerVehicles.errors.vehicleNotFound');
    }
    return deleted;
  }

  async deleteAllByAccount(accountId: Types.ObjectId) {
    return this.customerVehicleModel.deleteMany({ account: accountId }).exec();
  }
}