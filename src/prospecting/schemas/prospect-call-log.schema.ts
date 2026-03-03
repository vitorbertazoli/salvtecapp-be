import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { IProspectBusiness } from './prospect-business.schema';

export type ProspectCallLogDocument = ProspectCallLog & Document;

@Schema({ timestamps: true })
export class ProspectCallLog {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProspectBusiness', required: true })
  prospectBusiness: Types.ObjectId;

  @Prop({ required: true })
  calledAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  calledBy: Types.ObjectId;

  @Prop({
    enum: ['no_answer', 'interested', 'callback_requested', 'not_interested', 'wrong_number'],
    required: true
  })
  outcome: 'no_answer' | 'interested' | 'callback_requested' | 'not_interested' | 'wrong_number';

  @Prop({ trim: true })
  notes?: string;

  @Prop()
  callbackDate?: Date;
}

export interface IProspectCallLog {
  id: string;
  account: string | IAccount;
  prospectBusiness: string | IProspectBusiness;
  calledAt: Date;
  calledBy: string | Types.ObjectId;
  outcome: 'no_answer' | 'interested' | 'callback_requested' | 'not_interested' | 'wrong_number';
  notes?: string;
  callbackDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProspectCallLogSchema = SchemaFactory.createForClass(ProspectCallLog);

ProspectCallLogSchema.index({ account: 1, prospectBusiness: 1, calledAt: -1 });
