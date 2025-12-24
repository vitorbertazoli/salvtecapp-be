import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ServiceOrderDocument = ServiceOrder & Document;

export class ServiceOrderItem {
  @Prop({ required: true, enum: ['service', 'product'] })
  type: 'service' | 'product';

  @Prop({ type: Types.ObjectId, required: true, refPath: 'items.type' })
  itemId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitValue: number;

  @Prop({ required: true, min: 0 })
  totalValue: number;
}

export class Equipment {
  name: string;
  room?: string;
  btus?: number;
  type: string;
  subType?: string;
  maker?: string;
  model?: string;
}

@Schema({ timestamps: true })
export class ServiceOrder {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Quote', required: true })
  quote: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({
    type: [
      {
        name: { type: String, required: true },
        room: String,
        btus: Number,
        type: { type: String, required: true },
        subType: String,
        maker: String,
        model: String
      }
    ],
    default: []
  })
  equipments?: Equipment[];

  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  account: Types.ObjectId;

  @Prop({ type: [ServiceOrderItem], required: true })
  items: ServiceOrderItem[];

  @Prop()
  description?: string;

  @Prop({ min: 0, max: 100 })
  discount?: number;

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0 })
  totalValue: number;

  @Prop({ required: true, default: Date.now })
  issuedAt: Date;

  @Prop()
  scheduledDate?: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Technician' })
  assignedTechnician?: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  })
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

  @Prop({
    required: true,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  })
  priority: 'low' | 'normal' | 'high' | 'urgent';

  @Prop()
  notes?: string;

  @Prop()
  customerNotes?: string;

  @Prop({
    required: true,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending'
  })
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';

  @Prop({ default: 0, min: 0 })
  paidAmount: number;

  @Prop()
  paymentMethod?: string;

  @Prop()
  paymentDate?: Date;
}

export const ServiceOrderSchema = SchemaFactory.createForClass(ServiceOrder);
