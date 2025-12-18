import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service, ServiceDocument } from './schemas/service.schema';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) { }

  async create(serviceData: Partial<Service>): Promise<Service> {
    const createdService = new this.serviceModel(serviceData);
    return createdService.save();
  }

  async findAll(): Promise<Service[]> {
    return this.serviceModel.find().populate('account').exec();
  }

  async findOne(id: string, accountId?: string): Promise<Service | null> {
    const query = accountId ? { _id: id, account: accountId } : { _id: id };
    return this.serviceModel.findOne(query).populate('account').exec();
  }

  async findByAccount(accountId: string): Promise<Service[]> {
    return this.serviceModel.find({ account: new Types.ObjectId(accountId) }).populate('account').exec();
  }

  async update(
    id: string,
    serviceData: Partial<Service>,
    accountId?: string,
  ): Promise<Service | null> {
    const query = accountId ? { _id: id, account: accountId } : { _id: id };
    return this.serviceModel
      .findOneAndUpdate(query, serviceData, { new: true })
      .populate('account')
      .exec();
  }

  async delete(id: string, accountId?: string): Promise<Service | null> {
    const query = accountId ? { _id: id, account: accountId } : { _id: id };
    return this.serviceModel.findOneAndDelete(query).exec();
  }
}