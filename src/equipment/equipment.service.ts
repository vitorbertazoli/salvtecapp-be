import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Equipment, EquipmentDocument } from './schemas/equipment.schema';

@Injectable()
export class EquipmentService {
  constructor(@InjectModel(Equipment.name) private equipmentModel: Model<EquipmentDocument>) {}

  async create(equipmentData: Partial<Equipment>): Promise<Equipment> {
    const createdEquipment = new this.equipmentModel(equipmentData);
    return createdEquipment.save();
  }

  async findAll(): Promise<Equipment[]> {
    return this.equipmentModel.find().exec();
  }

  async findOne(id: string): Promise<Equipment | null> {
    return this.equipmentModel.findById(id).exec();
  }

  async update(id: string, equipmentData: Partial<Equipment>): Promise<Equipment | null> {
    return this.equipmentModel.findByIdAndUpdate(id, equipmentData, { new: true }).exec();
  }

  async findByCustomer(customerId: string): Promise<Equipment[]> {
    return this.equipmentModel.find({ customer: customerId }).exec();
  }

  async delete(id: string): Promise<Equipment | null> {
    return this.equipmentModel.findByIdAndDelete(id).exec();
  }
}
