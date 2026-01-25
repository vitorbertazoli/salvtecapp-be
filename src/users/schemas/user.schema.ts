import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ enum: ['active', 'inactive', 'suspended'], default: 'active' })
  status: 'active' | 'inactive' | 'suspended';

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Role' }], default: [] })
  roles: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  isMasterAdmin: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;

  @Prop()
  resetToken?: string;

  @Prop()
  resetTokenExpiry?: Date;

  @Prop()
  language?: string;

  @Prop()
  profilePicture?: string;

  @Prop()
  phoneNumber?: string;
}

export interface IUser {
  id: string;
  account: string | IAccount;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  isMasterAdmin?: boolean;
  resetToken?: string;
  resetTokenExpiry?: Date;
  language?: string;
  profilePicture?: string;
  phoneNumber?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ roles: 1 });
