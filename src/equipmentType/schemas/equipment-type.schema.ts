import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EquipmentTypeDocument = EquipmentType & Document;

@Schema({ timestamps: true })
export class EquipmentType {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;
}

export interface IEquipmentType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
}

export const EquipmentTypeSchema = SchemaFactory.createForClass(EquipmentType);
EquipmentTypeSchema.virtual('id').get(function (this: EquipmentTypeDocument) {
  return this._id.toHexString();
});

EquipmentTypeSchema.set('toJSON', {
  virtuals: true
});
