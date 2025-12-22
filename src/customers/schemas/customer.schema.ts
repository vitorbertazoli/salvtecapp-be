import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { IAddress } from 'src/accounts/schemas/address.schema';
import { IEquipment } from 'src/equipment/schemas/equipment.schema';
import { ITechnician } from 'src/technicians/schemas/technician.schema';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  cpf?: string;

  @Prop({
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  })
  status: 'active' | 'inactive' | 'suspended';

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Technician' })
  technicianResponsible?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Address', required: true })
  address: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;
}

export interface ICustomer {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  status: 'active' | 'inactive' | 'suspended';
  phoneNumber: string;
  technicianResponsible?: string | ITechnician;
  address: string | IAddress;
  account: string | IAccount;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
  equipments?: IEquipment[]; // Array of equipment for this customer
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Create compound unique indexes for account-specific uniqueness
CustomerSchema.index({ cpf: 1, account: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ status: 1 });
CustomerSchema.index({ technicianResponsible: 1 });
CustomerSchema.index({ account: 1 });
