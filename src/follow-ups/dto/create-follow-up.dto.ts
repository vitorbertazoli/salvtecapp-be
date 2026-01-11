import { IsArray, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFollowUpDto {
  @IsNotEmpty()
  @IsMongoId()
  customer: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsEnum(['pending', 'completed'])
  status?: 'pending' | 'completed';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notes?: string[];
}
