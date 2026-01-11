import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VehicleUsageDocument = VehicleUsage & Document;

@Schema({ timestamps: true })
export class VehicleUsage {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Technician', required: true })
  technician: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Vehicle', required: true })
  vehicle: Types.ObjectId;

  @Prop({ required: true })
  departureDate: Date;

  @Prop({ required: true })
  departureMileage: number;

  @Prop()
  arrivalDate?: Date;

  @Prop()
  arrivalMileage?: number;

  @Prop({ enum: ['pending', 'approved'], default: 'pending' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const VehicleUsageSchema = SchemaFactory.createForClass(VehicleUsage);
