import { IsDateString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class SimulateContractPaymentsDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  expireDate: string;

  @IsOptional()
  @IsDateString()
  firstPaymentDate?: string;

  @IsOptional()
  @IsEnum(['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  frequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @IsOptional()
  @IsEnum(['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  paymentFrequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountToDeduct?: number;
}
