import { IsOptional, IsString } from 'class-validator';

export class ProspectCallReportQueryDto {
  @IsOptional()
  @IsString()
  timezone?: string;
}