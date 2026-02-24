import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class RecurringConfigDto {
  @IsNotEmpty()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @ArrayMinSize(0)
  @ArrayMaxSize(7)
  daysOfWeek?: number[];

  @IsNotEmpty()
  @IsString()
  untilDate: string;
}

export class UpdateRecurringConfigDto {
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @ArrayMinSize(0)
  @ArrayMaxSize(7)
  daysOfWeek?: number[];

  @IsOptional()
  @IsString()
  untilDate?: string;
}

export class RecurringUpdateOptionsDto {
  @IsOptional()
  @IsEnum(['single', 'future', 'all'])
  scope?: 'single' | 'future' | 'all';

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateRecurringConfigDto)
  recurringConfig?: UpdateRecurringConfigDto;
}
