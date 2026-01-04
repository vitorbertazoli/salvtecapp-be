import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { IAddress } from 'src/accounts/schemas/address.schema';
import { ITechnician } from 'src/technicians/schemas/technician.schema';

export type CustomerDocument = Customer & Document;

export class Equipment {
  name: string;
  room?: string;
  btus?: number;
  type: string;
  subType?: string;
  maker?: string;
  model?: string;
}

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

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

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Technician' })
  technicianResponsible?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Address', required: true })
  address: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

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
  equipments: Equipment[];

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;
}

export interface ICustomer {
  id: string;
  name: string;
  email: string;
  type: 'residential' | 'commercial';
  cpf?: string;
  cnpj?: string;
  contactName?: string;
  status: 'active' | 'inactive' | 'suspended';
  phoneNumber: string;
  technicianResponsible?: string | ITechnician;
  address: string | IAddress;
  account: string | IAccount;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
  equipments?: Equipment[]; // Array of equipment for this customer
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Add custom validation
CustomerSchema.pre('validate', function (next) {
  if (this.type === 'residential' && !this.cpf) {
    this.invalidate('cpf', 'CPF is required for residential customers');
  }
  if (this.type === 'commercial') {
    if (!this.cnpj) {
      this.invalidate('cnpj', 'CNPJ is required for commercial customers');
    }
    if (!this.contactName) {
      this.invalidate('contactName', 'Contact name is required for commercial customers');
    }
  }
  next();
});

// Create compound unique indexes for account-specific uniqueness
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ status: 1 });
CustomerSchema.index({ technicianResponsible: 1 });
CustomerSchema.index({ account: 1 });
