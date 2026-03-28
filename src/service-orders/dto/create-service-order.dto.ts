import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

class ServiceOrderItemDto {
  @IsNotEmpty()
  @IsEnum(['service', 'product'])
  type: 'service' | 'product';

  @IsNotEmpty()
  @IsMongoId()
  itemId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitValue: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalValue: number;
}

class EquipmentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsNumber()
  btus?: number;

  @IsOptional()
  @IsString()
  maker?: string;

  @IsOptional()
  @IsString()
  model?: string;
}

export class CreateServiceOrderDto {
  @IsNotEmpty()
  @IsMongoId()
  quote: string;

  @IsNotEmpty()
  @IsMongoId()
  customer: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentDto)
  equipments?: EquipmentDto[];

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceOrderItemDto)
  items: ServiceOrderItemDto[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Min(0, { message: 'Discount cannot exceed 100%' })
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
  @IsNumber()
  @Min(0)
  serviceTaxAmount?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalValue: number;

  @IsNotEmpty()
  @IsDateString()
  issuedAt: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsMongoId()
  assignedTechnician?: string;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;
}
