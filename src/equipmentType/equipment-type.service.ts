import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EquipmentType, EquipmentTypeDocument } from './schemas/equipment-type.schema';

@Injectable()
export class EquipmentTypeService {
  constructor(@InjectModel(EquipmentType.name) private equipmentTypeModel: Model<EquipmentTypeDocument>) {}

  async findAll(): Promise<EquipmentType[]> {
    return this.equipmentTypeModel.find().exec();
  }

  async findOne(id: string): Promise<EquipmentType | null> {
    return this.equipmentTypeModel.findById(id).exec();
  }
}
