import { Transform, Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsMongoId, IsOptional, Min } from 'class-validator';

export class TimekeepingQueryDto {
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn(['pending', 'approved'])
  status?: 'pending' | 'approved';

  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
