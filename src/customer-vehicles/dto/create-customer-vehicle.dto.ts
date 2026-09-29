import { IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCustomerVehicleDto {
  @IsMongoId()
  customer: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(1886)
  @Max(new Date().getFullYear() + 1)
  year?: number;
}