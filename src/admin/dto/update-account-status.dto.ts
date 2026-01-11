import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateAccountStatusDto {
  @IsNotEmpty()
  @IsEnum(['pending', 'active', 'suspended'])
  status: 'pending' | 'active' | 'suspended';
}
