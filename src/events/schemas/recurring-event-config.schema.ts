import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecurringEventConfigDocument = RecurringEventConfig & Document;

@Schema({ timestamps: true })
export class RecurringEventConfig {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true, index: true })
  account: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  })
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @Prop({ type: Number, required: true, min: 1, default: 1 })
  interval: number;

  @Prop({ type: [Number], default: [] })
  daysOfWeek: number[];

  @Prop({ required: true, index: true })
  startDate: string;

  @Prop({ required: true, index: true })
  untilDate: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const RecurringEventConfigSchema = SchemaFactory.createForClass(RecurringEventConfig);

RecurringEventConfigSchema.index({ account: 1, startDate: 1, untilDate: 1 });
