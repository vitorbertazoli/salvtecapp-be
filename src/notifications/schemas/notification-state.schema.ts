import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationStateDocument = NotificationState & Document;

@Schema({ timestamps: true })
export class NotificationState {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true, index: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true, index: true })
  scope: string;

  @Prop({ required: true })
  seenAt: Date;
}

export const NotificationStateSchema = SchemaFactory.createForClass(NotificationState);

NotificationStateSchema.index({ account: 1, user: 1, scope: 1 }, { unique: true });
