import { IsDateString, IsInt, IsMongoId, IsNotEmpty, IsString, Matches, Max, Min } from 'class-validator';

export class CreateTimekeepingEntryDto {
  @IsNotEmpty()
  @IsMongoId()
  employee: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  checkIn: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  checkOut: string;

  @IsInt()
  @Min(0)
  @Max(600)
  breakMinutes: number;
}
