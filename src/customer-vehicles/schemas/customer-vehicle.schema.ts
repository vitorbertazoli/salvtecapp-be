import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerVehicleDocument = CustomerVehicle & Document;

@Schema({ timestamps: true })
export class CustomerVehicle {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop()
  make?: string;

  @Prop()
  model?: string;

  @Prop({ min: 1886 })
  year?: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const CustomerVehicleSchema = SchemaFactory.createForClass(CustomerVehicle);
CustomerVehicleSchema.index({ account: 1, customer: 1 });