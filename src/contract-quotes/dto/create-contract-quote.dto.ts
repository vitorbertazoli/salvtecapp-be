import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class ContractQuoteServiceItemDto {
  @IsNotEmpty()
  @IsMongoId()
  service: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitValue: number;
}

export class CreateContractQuoteDto {
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  expireDate: string;

  @IsOptional()
  @IsEnum(['draft', 'sent', 'accepted', 'rejected'])
  status?: 'draft' | 'sent' | 'accepted' | 'rejected';

  @IsNotEmpty()
  @IsEnum(['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  maintenanceFrequency: 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @IsNotEmpty()
  @IsEnum(['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  paymentFrequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @IsNotEmpty()
  @IsString()
  terms: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  value: number;

  @IsNotEmpty()
  @IsMongoId()
  customer: string;

  @IsNotEmpty()
  @IsDateString()
  firstPaymentDate: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractQuoteServiceItemDto)
  services?: ContractQuoteServiceItemDto[];
}
