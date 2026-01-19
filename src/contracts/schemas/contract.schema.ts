import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { ICustomer } from 'src/customers/schemas/customer.schema';

export type ContractDocument = Contract & Document;

@Schema({ timestamps: true })
export class Contract {
  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  expireDate: Date;

  @Prop({
    enum: ['pending', 'active', 'expired', 'cancelled'],
    default: 'active'
  })
  status: 'pending' | 'active' | 'expired' | 'cancelled';

  @Prop({
    enum: ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'],
    required: true
  })
  frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @Prop({ required: true })
  terms: string;

  @Prop({ required: true, type: Number, min: 0 })
  value: number;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export interface IContract {
  id: string;
  startDate: Date;
  expireDate: Date;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
  terms: string;
  value: number;
  customer: string | ICustomer;
  account: string | IAccount;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);

// Create indexes for better query performance
ContractSchema.index({ customer: 1 });
ContractSchema.index({ account: 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ expireDate: 1 });
ContractSchema.index({ startDate: 1 });
