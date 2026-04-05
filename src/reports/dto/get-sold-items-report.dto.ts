import { IsOptional, Matches } from 'class-validator';

export class GetSoldItemsReportDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'startMonth must be in YYYY-MM format' })
  startMonth?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'endMonth must be in YYYY-MM format' })
  endMonth?: string;
}
