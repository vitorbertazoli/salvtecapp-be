import { IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateContractDto {
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  expireDate: string;

  @IsOptional()
  @IsEnum(['pending', 'active', 'expired', 'cancelled'])
  status?: 'pending' | 'active' | 'expired' | 'cancelled';

  @IsNotEmpty()
  @IsEnum(['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

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
}
