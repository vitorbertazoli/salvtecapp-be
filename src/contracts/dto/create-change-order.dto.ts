import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ContractServiceItemDto {
  @IsMongoId()
  service: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitValue: number;
}

export class CreateContractChangeOrderDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expireDate?: string;

  @IsOptional()
  @IsEnum(['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  frequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @IsOptional()
  @IsEnum(['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  maintenanceFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @IsOptional()
  @IsEnum(['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  paymentFrequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @IsOptional()
  @IsDateString()
  firstPaymentDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractServiceItemDto)
  services?: ContractServiceItemDto[];

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
