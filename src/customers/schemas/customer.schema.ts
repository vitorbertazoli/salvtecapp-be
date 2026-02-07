import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';

export type CustomerDocument = Customer & Document;

export class Equipment {
  _id: string;
  name: string;
  room?: string;
  btus?: number;
  maker?: string;
  model?: string;
  pictures?: string[];
}

export class Note {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export class Picture {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  createdDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export class Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  name: string;

  @Prop()
  email?: string;

  @Prop({
    enum: ['residential', 'commercial'],
    default: 'residential'
  })
  type: 'residential' | 'commercial';

  @Prop()
  cpf?: string;

  @Prop()
  cnpj?: string;

  @Prop()
  contactName?: string;

  @Prop({
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  })
  status: 'active' | 'inactive' | 'suspended';

  @Prop({ type: [String], default: [] })
  phoneNumbers: string[];

  @Prop()
  notes?: string;

  @Prop({
    type: [
      {
        date: { type: Date, required: true },
        content: { type: String, required: true },
        createdBy: { type: Types.ObjectId, ref: 'User', required: true }
      }
    ],
    default: []
  })
  noteHistory: Note[];

  @Prop({
    type: {
      street: String,
      number: String,
      complement: String,
      neighborhood: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'Brazil' }
    }
  })
  address?: Address;

  @Prop({ type: Types.ObjectId, ref: 'Account' })
  account?: Types.ObjectId;

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        room: String,
        btus: Number,
        maker: String,
        model: String,
        pictures: { type: [String], default: [] }
      }
    ],
    default: []
  })
  equipments: Equipment[];

  @Prop({
    type: [
      {
        url: { type: String, required: true },
        createdDate: { type: Date, required: true },
        createdBy: { type: Types.ObjectId, ref: 'User', required: true }
      }
    ],
    default: []
  })
  pictures: Picture[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export interface ICustomer {
  id: string;
  name: string;
  email?: string;
  type: 'residential' | 'commercial';
  cpf?: string;
  cnpj?: string;
  contactName?: string;
  status: 'active' | 'inactive' | 'suspended';
  phoneNumbers?: string[];
  notes?: string;
  noteHistory?: Note[];
  address?: Address;
  account?: string | IAccount;
  createdBy: string | Types.ObjectId;
  updatedBy: string | Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  equipments?: Equipment[]; // Array of equipment for this customer
  pictures?: Picture[]; // Array of pictures for this customer
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Create compound unique indexes for account-specific uniqueness
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ status: 1 });
CustomerSchema.index({ account: 1 });
