import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service, ServiceDocument } from './schemas/service.schema';

@Injectable()
export class ServicesService {
  constructor(@InjectModel(Service.name) private serviceModel: Model<ServiceDocument>) {}

  async create(serviceData: Partial<Service>): Promise<Service> {
    const createdService = new this.serviceModel(serviceData);
    return createdService.save();
  }

  async findOne(id: string, accountId?: string): Promise<Service | null> {
    const query = accountId ? { _id: id, account: new Types.ObjectId(accountId) } : { _id: id };
    return this.serviceModel.findOne(query).populate('account').exec();
  }

  async findByAccount(
    accountId: string,
    page: number = 1,
    limit: number = 10,
    search: string = ''
  ): Promise<{
    services: Service[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery: any = { account: new Types.ObjectId(accountId) };
    if (search) {
      searchQuery.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
    }

    const [services, total] = await Promise.all([
      this.serviceModel
        .find(searchQuery)
        .populate('account')
        .sort({ createdAt: -1 }) // Sort by creation date, newest first
        .skip(skip)
        .limit(limit)
        .exec(),
      this.serviceModel.countDocuments(searchQuery).exec()
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      services,
      total,
      page,
      limit,
      totalPages
    };
  }

  async update(id: string, serviceData: Partial<Service>, accountId: string): Promise<Service | null> {
    const query = { _id: id, account: new Types.ObjectId(accountId) };
    return this.serviceModel.findOneAndUpdate(query, serviceData, { new: true }).populate('account').exec();
  }

  async delete(id: string, accountId?: string): Promise<Service | null> {
    const query = accountId ? { _id: id, account: new Types.ObjectId(accountId) } : { _id: id };
    return this.serviceModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: string): Promise<any> {
    return this.serviceModel.deleteMany({ account: new Types.ObjectId(accountId) }).exec();
  }
}
