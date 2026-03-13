import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { ICustomer } from 'src/customers/schemas/customer.schema';

export type ContractDocument = Contract & Document;

export class ContractFile {
  _id: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, min: 0 })
  size: number;

  @Prop({ required: true })
  createdDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export class ContractServiceItem {
  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  service: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitValue: number;
}

export class ContractChangeOrderSnapshot {
  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  expireDate: Date;

  @Prop({ required: true, enum: ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] })
  frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @Prop({ enum: ['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] })
  maintenanceFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @Prop({ enum: ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] })
  paymentFrequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @Prop({ type: Date })
  firstPaymentDate?: Date;

  @Prop({ type: [ContractServiceItem], default: [] })
  services?: ContractServiceItem[];

  @Prop({ required: true })
  terms: string;

  @Prop({ required: true, type: Number, min: 0 })
  value: number;
}

export class ContractChangeOrder {
  @Prop({ required: true })
  version: number;

  @Prop({ type: ContractChangeOrderSnapshot, required: true })
  originalData: ContractChangeOrderSnapshot;

  @Prop({ type: ContractChangeOrderSnapshot, required: true })
  modifiedData: ContractChangeOrderSnapshot;

  @Prop()
  description?: string;

  @Prop({
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  })
  status: 'pending' | 'approved' | 'rejected';

  @Prop()
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

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

  @Prop({
    enum: ['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annual']
  })
  maintenanceFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @Prop({
    enum: ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual']
  })
  paymentFrequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @Prop({ type: Date })
  firstPaymentDate?: Date;

  @Prop({
    type: [ContractServiceItem],
    default: []
  })
  services?: ContractServiceItem[];

  @Prop({ required: true })
  terms: string;

  @Prop({
    type: [
      {
        url: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true, min: 0 },
        createdDate: { type: Date, required: true },
        createdBy: { type: Types.ObjectId, ref: 'User', required: true }
      }
    ],
    default: []
  })
  files: ContractFile[];

  @Prop({ required: true, type: Number, min: 0 })
  value: number;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ContractQuotes' })
  contractQuote?: Types.ObjectId;

  @Prop({ type: [ContractChangeOrder], default: [] })
  changeOrders?: ContractChangeOrder[];

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
  maintenanceFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
  paymentFrequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
  firstPaymentDate?: Date;
  services?: {
    service: string;
    quantity: number;
    unitValue: number;
  }[];
  terms: string;
  files?: ContractFile[];
  value: number;
  customer: string | ICustomer;
  contractQuote?: string;
  changeOrders?: {
    version: number;
    originalData: {
      startDate: Date;
      expireDate: Date;
      frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
      maintenanceFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
      paymentFrequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
      firstPaymentDate?: Date;
      services?: {
        service: string;
        quantity: number;
        unitValue: number;
      }[];
      terms: string;
      value: number;
    };
    modifiedData: {
      startDate: Date;
      expireDate: Date;
      frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
      maintenanceFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
      paymentFrequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
      firstPaymentDate?: Date;
      services?: {
        service: string;
        quantity: number;
        unitValue: number;
      }[];
      terms: string;
      value: number;
    };
    description?: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: Date;
    approvedBy?: string;
    createdBy: string;
    createdAt: Date;
  }[];
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
ContractSchema.index({ contractQuote: 1 });
