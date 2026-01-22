import { IsEnum, IsNumber, Min } from 'class-validator';

export class ApproveChangeOrderDto {
  @IsNumber()
  @Min(1)
  version: number;

  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';
}
