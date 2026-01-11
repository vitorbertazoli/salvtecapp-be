import { IsDateString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateVehicleUsageDto {
  @IsOptional()
  @IsDateString()
  arrivalDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  arrivalMileage?: number;

  @IsOptional()
  @IsEnum(['pending', 'approved'])
  status?: 'pending' | 'approved';
}
