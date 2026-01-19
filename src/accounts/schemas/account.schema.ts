import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AccountDocument = Account & Document;

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true })
  name: string;

  @Prop()
  logoUrl?: string;

  @Prop({
    required: true,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  })
  plan: 'free' | 'pro' | 'enterprise';

  @Prop({
    required: true,
    enum: ['pending', 'active', 'suspended'],
    default: 'pending'
  })
  status: 'pending' | 'active' | 'suspended';

  @Prop()
  verificationToken?: string;

  @Prop()
  verificationTokenExpires?: Date;

  @Prop()
  expireDate?: Date;

  @Prop({ type: Object })
  billingInfo: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export interface IAccount {
  id: string;
  name: string;
  logoUrl?: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'pending' | 'active' | 'suspended';
  verificationToken?: string;
  verificationTokenExpires?: Date;
  expireDate?: Date;
  billingInfo: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
  };
}

export const AccountSchema = SchemaFactory.createForClass(Account);
AccountSchema.virtual('id').get(function (this: AccountDocument) {
  return this._id.toHexString();
});

AccountSchema.set('toJSON', {
  virtuals: true
});
