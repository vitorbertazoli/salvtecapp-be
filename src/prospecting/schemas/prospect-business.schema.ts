import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';

export type ProspectBusinessDocument = ProspectBusiness & Document;

export class ProspectLocation {
  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;
}

@Schema({ timestamps: true })
export class ProspectBusiness {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ required: true })
  googlePlaceId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  })
  location?: ProspectLocation;

  @Prop()
  lastCallAt?: Date;

  @Prop()
  nextAllowedCallAt?: Date;

  @Prop()
  doNotCallUntil?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export interface IProspectBusiness {
  id: string;
  account: string | IAccount;
  googlePlaceId: string;
  name: string;
  address?: string;
  phone?: string;
  location?: ProspectLocation;
  lastCallAt?: Date;
  nextAllowedCallAt?: Date;
  doNotCallUntil?: Date;
  createdBy: string | Types.ObjectId;
  updatedBy: string | Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProspectBusinessSchema = SchemaFactory.createForClass(ProspectBusiness);

ProspectBusinessSchema.index({ account: 1, googlePlaceId: 1 }, { unique: true });
ProspectBusinessSchema.index({ account: 1, lastCallAt: -1 });
