import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateFollowUpDto {
  @IsOptional()
  @IsEnum(['pending', 'completed'])
  status?: 'pending' | 'completed';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notes?: string[];
}
