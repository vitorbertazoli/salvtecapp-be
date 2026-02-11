import { IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import type { ExpenseCategoryType } from '../schemas/expense.schema';

export class CreateExpenseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: ExpenseCategoryType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}\/\d{2}\/\d{2}$/, { message: 'expenseDate must be in YYYY/MM/DD format' })
  expenseDate: string;
}
