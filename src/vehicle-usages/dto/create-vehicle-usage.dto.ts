import { IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateVehicleUsageDto {
  @IsNotEmpty()
  @IsMongoId()
  technician: string;

  @IsNotEmpty()
  @IsMongoId()
  vehicle: string;

  @IsNotEmpty()
  @IsDateString()
  departureDate: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  departureMileage: number;

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
