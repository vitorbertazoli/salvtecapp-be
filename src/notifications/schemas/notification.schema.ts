import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export type NotificationTargetType = 'USER' | 'ROLE' | 'ACCOUNT';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true, index: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipientUser: Types.ObjectId;

  @Prop({ required: true, enum: ['USER', 'ROLE', 'ACCOUNT'], index: true })
  targetType: NotificationTargetType;

  @Prop({ type: [String], default: [] })
  targetRoles: string[];

  @Prop({ required: true, index: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  data?: Record<string, unknown>;

  @Prop()
  url?: string;

  @Prop()
  source?: string;

  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  @Prop()
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ account: 1, recipientUser: 1, createdAt: -1 });
NotificationSchema.index({ account: 1, recipientUser: 1, isRead: 1, createdAt: -1 });
