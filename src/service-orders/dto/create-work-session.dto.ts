import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateWorkSessionDto {
  @IsDateString()
  startedAt: string;

  @IsDateString()
  endedAt: string;

  @IsOptional()
  @IsMongoId()
  technician?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
