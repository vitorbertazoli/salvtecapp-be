import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
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
}
