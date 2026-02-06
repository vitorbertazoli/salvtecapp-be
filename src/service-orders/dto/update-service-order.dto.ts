import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ServiceOrderItemDto {
  @IsOptional()
  @IsEnum(['service', 'product'])
  type?: 'service' | 'product';

  @IsOptional()
  @IsMongoId()
  itemId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalValue?: number;
}

class EquipmentDto {
  @IsOptional()
  @IsString()
  name?: string;

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

export class UpdateServiceOrderDto {
  @IsOptional()
  @IsMongoId()
  quote?: string;

  @IsOptional()
  @IsMongoId()
  customer?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquipmentDto)
  equipments?: EquipmentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceOrderItemDto)
  items?: ServiceOrderItemDto[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Min(0, { message: 'Discount cannot exceed 100%' })
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalValue?: number;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsMongoId()
  assignedTechnician?: string;

  @IsOptional()
  @IsEnum(['pending', 'scheduled', 'in_progress', 'completed', 'payment_order_created', 'cancelled'])
  status?: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'payment_order_created' | 'cancelled';

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
