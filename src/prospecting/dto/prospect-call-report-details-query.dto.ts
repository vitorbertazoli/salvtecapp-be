import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class ProspectCallReportDetailsQueryDto {
  @IsIn(['day', 'week', 'month', 'all'])
  period: 'day' | 'week' | 'month' | 'all';

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
