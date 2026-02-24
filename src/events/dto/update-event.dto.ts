import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { RecurringUpdateOptionsDto } from './recurring-config.dto';

export class UpdateEventDto {
  @IsNotEmpty()
  @IsString()
  date: string;

  @IsNotEmpty()
  @IsString()
  startTime: string;

  @IsNotEmpty()
  @IsString()
  endTime: string;

  @IsNotEmpty()
  @IsMongoId()
  customer: string;

  @IsNotEmpty()
  @IsArray()
  @IsMongoId({ each: true })
  technician: string[];

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

  @IsOptional()
  @IsMongoId()
  recurringConfigId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringUpdateOptionsDto)
  recurringUpdate?: RecurringUpdateOptionsDto;
}
