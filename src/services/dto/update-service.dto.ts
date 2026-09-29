import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsEnum(['home', 'auto', 'both'])
  applicability?: 'home' | 'auto' | 'both';
}
