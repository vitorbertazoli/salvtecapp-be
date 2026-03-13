import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { ICustomer } from 'src/customers/schemas/customer.schema';

export type ContractQuotesDocument = ContractQuotes & Document;

export class Files {
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

@Schema({ timestamps: true })
export class ContractQuotes {
  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  expireDate: Date;

  @Prop({
    enum: ['draft', 'sent', 'accepted', 'rejected'],
    default: 'draft'
  })
  status: 'draft' | 'sent' | 'accepted' | 'rejected';

  @Prop({
    enum: ['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'],
    required: true
  })
  maintenanceFrequency: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @Prop({
    enum: ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'],
    required: true
  })
  paymentFrequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

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
  files: Files[];

  @Prop({ required: true, type: Number, min: 0 })
  value: number;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: Date, required: true })
  firstPaymentDate: Date;

  @Prop({
    type: [
      {
        service: { type: Types.ObjectId, ref: 'Service', required: true },
        quantity: { type: Number, required: true },
        unitValue: { type: Number, required: true }
      }
    ]
  })
  services?: {
    service: Types.ObjectId;
    quantity: number;
    unitValue: number;
  }[];

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contract' })
  contract?: Types.ObjectId;

  @Prop()
  approvalToken?: string;

  @Prop()
  approvalTokenExpires?: Date;

  @Prop()
  sentAt?: Date;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export interface IContractQuotes {
  id: string;
  startDate: Date;
  expireDate: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  maintenanceFrequency: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
  paymentFrequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';
  terms: string;
  files: Files[];
  firstPaymentDate: Date;
  services?: {
    service: string;
    quantity: number;
    unitValue: number;
  }[];
  value: number;
  customer: string | ICustomer;
  contract?: string;
  approvalToken?: string;
  approvalTokenExpires?: Date;
  sentAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  account: string | IAccount;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ContractQuotesSchema = SchemaFactory.createForClass(ContractQuotes);

// Create indexes for better query performance
ContractQuotesSchema.index({ customer: 1 });
ContractQuotesSchema.index({ account: 1 });
ContractQuotesSchema.index({ status: 1 });
ContractQuotesSchema.index({ expireDate: 1 });
ContractQuotesSchema.index({ startDate: 1 });
ContractQuotesSchema.index({ approvalToken: 1 });
ContractQuotesSchema.index({ contract: 1 });
