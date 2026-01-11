import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  maker?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsString()
  sku?: string;
}
