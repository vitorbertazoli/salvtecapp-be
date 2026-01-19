import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentOrderDocument = PaymentOrder & Document;

@Schema({ timestamps: true })
export class PaymentOrder {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServiceOrder' })
  serviceOrder?: Types.ObjectId;

  @Prop()
  paymentMethod?: string;

  @Prop({
    required: true,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending'
  })
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';

  @Prop({ required: true, min: 0 })
  paidAmount: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number; // Expected total payment amount

  @Prop()
  paymentDate?: Date;

  @Prop()
  dueDate?: Date; // When payment is expected

  @Prop()
  invoiceNumber?: string; // Reference to generated invoice

  @Prop()
  notes?: string; // Payment-specific notes

  @Prop({ min: 0 })
  discountAmount?: number; // Any discount applied

  @Prop({ min: 0 })
  taxAmount?: number; // Tax on the payment

  @Prop()
  transactionId?: string; // External payment processor transaction ID

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const PaymentOrderSchema = SchemaFactory.createForClass(PaymentOrder);
