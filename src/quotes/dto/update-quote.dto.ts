import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

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

class QuoteVehicleDetailsDto {
  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(1886)
  year?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  odometer?: number;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsEnum(['home', 'auto'])
  quoteType?: 'home' | 'auto';

  @IsOptional()
  @IsMongoId()
  customer?: string;

  @IsOptional()
  @IsMongoId()
  customerVehicle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuoteVehicleDetailsDto)
  vehicleDetails?: QuoteVehicleDetailsDto;

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
