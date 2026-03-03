import { IsArray, IsString } from 'class-validator';

export class ProspectStatusesDto {
  @IsArray()
  @IsString({ each: true })
  placeIds: string[];
}
