import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';

export class CreatePaymentOrderDto {
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsEnum(['pending', 'partial', 'paid', 'refunded'])
  paymentStatus?: 'pending' | 'partial' | 'paid' | 'refunded';

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;
}
