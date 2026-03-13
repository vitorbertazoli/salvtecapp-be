import { IsEnum, IsNumber, Min } from 'class-validator';

export class ApproveContractChangeOrderDto {
  @IsNumber()
  @Min(1)
  version: number;

  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';
}
