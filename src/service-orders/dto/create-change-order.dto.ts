import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateChangeOrderDto {
  @IsArray()
  modifiedItems: {
    type: 'service' | 'product';
    itemId: string;
    name: string;
    quantity: number;
    unitValue: number;
    totalValue: number;
    description?: string;
  }[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsBoolean()
  applyServiceTax?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceTaxPercent?: number;

  @IsOptional()
  @IsArray()
  otherDiscounts?: {
    description: string;
    amount: number;
  }[];

  @IsOptional()
  @IsArray()
  equipments?: {
    name: string;
    room?: string;
    btus?: number;
    maker?: string;
    model?: string;
    _id?: string;
  }[];
}
