import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

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
  type?: string;

  @IsOptional()
  @IsString()
  subType?: string;

  @IsOptional()
  @IsString()
  maker?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsMongoId()
  _id?: string;
}

class ServiceItemDto {
  @IsOptional()
  @IsMongoId()
  service?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitValue?: number;
}

class ProductItemDto {
  @IsOptional()
  @IsMongoId()
  product?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitValue?: number;
}

class OtherDiscountDto {
  @IsOptional()
  @IsMongoId()
  _id?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}

export class UpdateQuoteDto {
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
  @Type(() => ServiceItemDto)
  services?: ServiceItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductItemDto)
  products?: ProductItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalValue?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OtherDiscountDto)
  otherDiscounts?: OtherDiscountDto[];

  @IsOptional()
  @IsEnum(['draft', 'sent', 'accepted', 'rejected'])
  status?: 'draft' | 'sent' | 'accepted' | 'rejected';

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;
}
