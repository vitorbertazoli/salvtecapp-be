import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { Equipment, ICustomer } from 'src/customers/schemas/customer.schema';

export type QuoteDocument = Quote & Document;

@Schema({ timestamps: true })
export class Quote {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        room: String,
        btus: Number,
        type: { type: String, required: true },
        subType: String,
        maker: String,
        model: String
      }
    ],
    default: []
  })
  equipments?: Equipment[];

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

  @Prop({
    type: [
      {
        product: { type: Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        unitValue: { type: Number, required: true }
      }
    ]
  })
  products?: {
    product: Types.ObjectId;
    quantity: number;
    unitValue: number;
  }[];

  @Prop({ required: true })
  totalValue: number;

  @Prop()
  description?: string;

  @Prop({ min: 0, max: 100 })
  discount?: number;

  @Prop({
    type: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true }
      }
    ],
    default: []
  })
  otherDiscounts?: {
    description: string;
    amount: number;
  }[];

  @Prop({
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected'],
    default: 'draft'
  })
  status: 'draft' | 'sent' | 'accepted' | 'rejected';

  @Prop({ required: true })
  validUntil: Date;

  @Prop({ required: true })
  issuedAt: Date;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;
}

export interface IQuote {
  id: string;
  account: string | IAccount;
  customer: string | ICustomer;
  equipments?: Equipment[];
  services?: {
    service: string;
    quantity: number;
    unitValue: number;
  }[];
  products?: {
    product: string;
    quantity: number;
    unitValue: number;
  }[];
  totalValue: number;
  description?: string;
  discount?: number;
  otherDiscounts?: {
    description: string;
    amount: number;
  }[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  validUntil: Date;
  issuedAt: Date;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);
