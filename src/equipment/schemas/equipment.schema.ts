import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { ICustomer } from 'src/customers/schemas/customer.schema';

export type EquipmentDocument = Equipment & Document;

@Schema({ timestamps: true })
export class Equipment {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop()
  room?: string;

  @Prop()
  btus?: number;

  @Prop({ required: true })
  type: string;

  @Prop()
  subType?: string;

  @Prop()
  maker?: string;

  @Prop()
  model?: string;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ required: true })
  updatedBy: string;
}

export interface IEquipment {
  id: string;
  name: string;
  customer: string | ICustomer;
  room?: string;
  btus?: number;
  type: string;
  subType?: string;
  maker?: string;
  model?: string;
  account: string | IAccount;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);

// Create indexes for better query performance
EquipmentSchema.index({ customer: 1 });
EquipmentSchema.index({ account: 1 });
EquipmentSchema.index({ type: 1 });
EquipmentSchema.index({ maker: 1 });
