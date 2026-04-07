import { IsIn, IsOptional, IsString } from 'class-validator';

export class ProspectCallReportDetailsQueryDto {
  @IsIn(['day', 'week', 'month'])
  period: 'day' | 'week' | 'month';

  @IsOptional()
  @IsString()
  timezone?: string;
}
