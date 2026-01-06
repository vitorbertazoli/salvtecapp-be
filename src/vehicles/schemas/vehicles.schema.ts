import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VehicleDocument = Vehicle & Document;

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  licensePlate: string;

  @Prop()
  make?: string;

  @Prop()
  model?: string;

  @Prop()
  year?: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
