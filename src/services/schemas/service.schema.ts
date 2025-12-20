import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ServiceDocument = Service & Document;

@Schema({ timestamps: true })
export class Service {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  value: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'Account',
    required: true
  })
  account: Types.ObjectId;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;
}

export interface IService {
  id: string;
  name: string;
  description?: string;
  value: number;
  account: Types.ObjectId;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

// Create indexes for better query performance
ServiceSchema.index({ account: 1 });
ServiceSchema.index({ name: 1 });
