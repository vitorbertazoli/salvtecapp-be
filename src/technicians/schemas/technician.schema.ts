import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';

export type TechnicianDocument = Technician & Document;

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
export class Technician {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ required: true })
  cpf: string;

  @Prop({ enum: ['active', 'inactive', 'suspended'], default: 'active' })
  status: 'active' | 'inactive' | 'suspended';

  @Prop({ required: true, default: () => new Date() })
  startDate: Date;

  @Prop()
  endDate?: Date;

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
    },
    required: true
  })
  address: Address;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;
}

export interface ITechnician {
  id: string;
  account: string | IAccount;
  cpf: string;
  status: 'active' | 'inactive' | 'suspended';
  startDate: Date;
  endDate?: Date;
  address: Address;
  user?: string;
  phoneNumber: string;
}

export const TechnicianSchema = SchemaFactory.createForClass(Technician);

// Compound index to make cpf unique per account
TechnicianSchema.index({ account: 1, cpf: 1 }, { unique: true });
