import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['scheduled', 'completed', 'cancelled'])
  status?: 'scheduled' | 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  completionNotes?: string;

  @IsOptional()
  @IsMongoId()
  serviceOrder?: string;
}
