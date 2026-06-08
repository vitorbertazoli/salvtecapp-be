import { IsDateString, IsInt, IsMongoId, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateTimekeepingEntryDto {
  @IsOptional()
  @IsMongoId()
  employee?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  checkIn?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  checkOut?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  breakMinutes?: number;
}
