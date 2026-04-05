import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { PaymentOrder, PaymentOrderSchema } from '../payments/schemas/payment-order.schema';
import { ServiceOrder, ServiceOrderSchema } from '../service-orders/schemas/service-order.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: PaymentOrder.name, schema: PaymentOrderSchema },
      { name: ServiceOrder.name, schema: ServiceOrderSchema }
    ])
  ],
  controllers: [ReportsController],
  providers: [ReportsService]
})
export class ReportsModule {}
