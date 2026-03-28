import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { BillingInfoDto } from './billing-info.dto';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsNotEmpty({ message: 'account.validation.replyToEmailRequired' })
  @IsEmail({}, { message: 'account.validation.replyToEmailInvalid' })
  replyToEmail: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BillingInfoDto)
  billingInfo?: BillingInfoDto;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  customizations?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceTaxPercent?: number;
}
