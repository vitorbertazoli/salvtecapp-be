import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { IAddress } from 'src/accounts/schemas/address.schema';

export type TechnicianDocument = Technician & Document;

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

  @Prop({ type: Types.ObjectId, ref: 'Address', required: true })
  address: Types.ObjectId;

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
  address: string | IAddress;
  user?: string;
  phoneNumber: string;
}

export const TechnicianSchema = SchemaFactory.createForClass(Technician);

// Compound index to make cpf unique per account
TechnicianSchema.index({ account: 1, cpf: 1 }, { unique: true });
