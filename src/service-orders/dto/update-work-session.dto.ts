import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateWorkSessionDto {
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsMongoId()
  technician?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
