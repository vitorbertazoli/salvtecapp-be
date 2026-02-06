import { IsDateString, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import type { ExpenseCategoryType } from '../schemas/expense.schema';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: ExpenseCategoryType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}\/\d{2}\/\d{2}$/, { message: 'expenseDate must be in YYYY/MM/DD format' })
  expenseDate?: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsDateString()
  approvedDate?: string;
}
