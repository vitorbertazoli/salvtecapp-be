import { IsDateString, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateContractDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expireDate?: string;

  @IsOptional()
  @IsEnum(['pending', 'active', 'expired', 'cancelled'])
  status?: 'pending' | 'active' | 'expired' | 'cancelled';

  @IsOptional()
  @IsEnum(['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'])
  frequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

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
}
