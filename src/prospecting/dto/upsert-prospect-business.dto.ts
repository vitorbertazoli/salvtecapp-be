import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertProspectBusinessDto {
  @IsNotEmpty()
  @IsString()
  googlePlaceId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
