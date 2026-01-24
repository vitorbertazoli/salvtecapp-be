import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentOrderDocument = PaymentOrder & Document;
export type PaymentTransactionDocument = PaymentTransaction & Document;

@Schema({ timestamps: true })
export class PaymentTransaction {
  @Prop({ required: true, min: 0 })
  amount: number; // Amount of this specific payment

  @Prop({ required: true })
  paymentMethod: string; // Method used for this payment (cash, check, credit card, etc.)

  @Prop()
  transactionId?: string; // External payment processor transaction ID for this payment

  @Prop()
  paymentDate: Date; // When this payment was made

  @Prop()
  notes?: string; // Notes specific to this payment transaction

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId; // Who recorded this payment
}

export const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);

@Schema({ timestamps: true })
export class PaymentOrder {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServiceOrder' })
  serviceOrder?: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending'
  })
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';

  @Prop({ type: [PaymentTransactionSchema] })
  payments: PaymentTransaction[]; // Array of individual payment transactions

  @Prop({ required: true, min: 0 })
  totalAmount: number; // Expected total payment amount

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

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const PaymentOrderSchema = SchemaFactory.createForClass(PaymentOrder);
