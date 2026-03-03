import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProspectCallDto {
  @IsEnum(['no_answer', 'interested', 'callback_requested', 'not_interested', 'wrong_number'])
  outcome: 'no_answer' | 'interested' | 'callback_requested' | 'not_interested' | 'wrong_number';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  callbackDate?: string;
}
