import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { PaymentTransactionDto } from './payment-transaction.dto';

export class UpdatePaymentOrderDto {
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
