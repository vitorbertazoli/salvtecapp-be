import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ContractQuoteServiceItemDto {
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

export class UpdateContractQuoteDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expireDate?: string;

  @IsOptional()
  @IsEnum(['draft', 'sent'])
  status?: 'draft' | 'sent';

  @IsOptional()
  @IsEnum(['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  maintenanceFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @IsOptional()
  @IsEnum(['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  paymentFrequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsMongoId()
  customer?: string;

  @IsOptional()
  @IsDateString()
  firstPaymentDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractQuoteServiceItemDto)
  services?: ContractQuoteServiceItemDto[];
}
