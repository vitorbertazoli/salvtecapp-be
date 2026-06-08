import { IsOptional, IsString } from 'class-validator';

export class FollowUpNotificationSummaryQueryDto {
  @IsOptional()
  @IsString()
  timezone?: string;
}
