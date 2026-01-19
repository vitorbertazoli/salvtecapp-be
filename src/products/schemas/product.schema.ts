import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  maker?: string;

  @Prop()
  model?: string;

  @Prop({ required: true })
  value: number;

  @Prop()
  sku?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Account',
    required: true
  })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export interface IProduct {
  id: string;
  name: string;
  description?: string;
  maker?: string;
  model?: string;
  value: number;
  sku?: string;
  account: Types.ObjectId;
  createdBy: string | Types.ObjectId;
  updatedBy: string | Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Create indexes for better query performance
ProductSchema.index({ account: 1 });
ProductSchema.index({ name: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ maker: 1 });
