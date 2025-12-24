import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true, index: true })
  date: string;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Technician', required: true, index: true })
  technician: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true, index: true })
  account: Types.ObjectId;

  @Prop({ trim: true })
  title?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  })
  status: 'scheduled' | 'completed' | 'cancelled';

  @Prop({ trim: true })
  completionNotes?: string;

  @Prop()
  completedAt?: Date;

  @Prop()
  completedBy?: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;

  @Prop({ type: Types.ObjectId, ref: 'ServiceOrder' })
  serviceOrder?: Types.ObjectId;
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Create indexes for efficient queries
EventSchema.index({ account: 1, date: 1, technician: 1 });
EventSchema.index({ account: 1, date: 1, customer: 1 });
EventSchema.index({ account: 1, status: 1, date: 1 });
