import { IsDateString, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsEnum(['pending', 'active', 'suspended'])
  status?: 'pending' | 'active' | 'suspended';

  @IsOptional()
  @IsEmail()
  replyToEmail?: string;

  @IsOptional()
  @IsDateString()
  expireDate?: string;
}
