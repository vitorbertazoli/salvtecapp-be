import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EquipmentTypeController } from './equipment-type.controller';
import { EquipmentTypeService } from './equipment-type.service';
import { EquipmentType, EquipmentTypeSchema } from './schemas/equipment-type.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: EquipmentType.name, schema: EquipmentTypeSchema }])],
  controllers: [EquipmentTypeController],
  providers: [EquipmentTypeService],
  exports: [EquipmentTypeService]
})
export class EquipmentTypeModule {}
