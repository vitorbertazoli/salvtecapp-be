import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EquipmentTypeDocument = EquipmentType & Document;

@Schema({ timestamps: true })
export class EquipmentType {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export interface IEquipmentType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: string | Types.ObjectId;
  updatedBy: string | Types.ObjectId;
}

export const EquipmentTypeSchema = SchemaFactory.createForClass(EquipmentType);
EquipmentTypeSchema.virtual('id').get(function (this: EquipmentTypeDocument) {
  return this._id.toHexString();
});

EquipmentTypeSchema.set('toJSON', {
  virtuals: true
});
