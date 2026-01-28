import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CompleteEventDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  completeServiceOrder?: boolean;
}
