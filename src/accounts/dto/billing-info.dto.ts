import { IsOptional, IsString } from 'class-validator';

export class BillingInfoDto {
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  cvv?: string;
}
