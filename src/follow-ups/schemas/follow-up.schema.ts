import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { ICustomer } from 'src/customers/schemas/customer.schema';

export type FollowUpDocument = FollowUp & Document;

@Schema({ timestamps: true })
export class FollowUp {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({
    enum: ['pending', 'completed'],
    default: 'pending'
  })
  status: 'pending' | 'completed';

  @Prop()
  completedAt?: Date;

  @Prop()
  completedBy?: string;

  @Prop({ trim: true })
  notes?: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export interface IFollowUp {
  id: string;
  customer: string | ICustomer;
  account: string | IAccount;
  startDate: Date;
  status: 'pending' | 'completed';
  completedAt?: Date;
  completedBy?: string;
  notes?: string[];
  createdBy: string | Types.ObjectId;
  updatedBy: string | Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUp);

// Create indexes for efficient queries
FollowUpSchema.index({ account: 1, status: 1, startDate: 1 });
FollowUpSchema.index({ account: 1, customer: 1, status: 1 });
FollowUpSchema.index({ customer: 1 });
FollowUpSchema.index({ account: 1 });
FollowUpSchema.index({ startDate: 1 });
FollowUpSchema.index({ status: 1 });
