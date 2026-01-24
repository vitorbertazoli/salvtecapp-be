import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { PaymentTransactionDto } from './payment-transaction.dto';

export class UpdatePaymentOrderDto {
  @IsOptional()
  @IsEnum(['pending', 'partial', 'paid', 'refunded'])
  paymentStatus?: 'pending' | 'partial' | 'paid' | 'refunded';

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentTransactionDto)
  addPayments?: PaymentTransactionDto[]; // Add new payment transactions
}
