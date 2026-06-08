import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IAccount } from 'src/accounts/schemas/account.schema';
import { IUser } from 'src/users/schemas/user.schema';

export type TimekeepingEntryDocument = TimekeepingEntry & Document;

@Schema({ timestamps: true })
export class TimekeepingEntry {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  employee: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  checkIn: string;

  @Prop({ required: true })
  checkOut: string;

  @Prop({ required: true, default: 0, min: 0 })
  breakMinutes: number;

  @Prop({ required: true, default: 0, min: 0 })
  workedMinutes: number;

  @Prop({ enum: ['pending', 'approved'], default: 'pending' })
  status: 'pending' | 'approved';

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export interface ITimekeepingEntry {
  id: string;
  employee: string | IUser;
  date: Date;
  checkIn: string;
  checkOut: string;
  breakMinutes: number;
  workedMinutes: number;
  status: 'pending' | 'approved';
  approvedBy?: string | Types.ObjectId;
  approvedAt?: Date;
  account: string | IAccount;
  createdBy: string | Types.ObjectId;
  updatedBy: string | Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export const TimekeepingEntrySchema = SchemaFactory.createForClass(TimekeepingEntry);

TimekeepingEntrySchema.index({ account: 1, date: -1, status: 1 });
TimekeepingEntrySchema.index({ account: 1, employee: 1, date: -1 });
TimekeepingEntrySchema.index({ account: 1, createdBy: 1, date: -1 });
