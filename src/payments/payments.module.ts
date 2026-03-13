import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Contract, ContractSchema } from '../contracts/schemas/contract.schema';
import { ServiceOrder, ServiceOrderSchema } from '../service-orders/schemas/service-order.schema';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentOrder, PaymentOrderSchema } from './schemas/payment-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentOrder.name, schema: PaymentOrderSchema },
      { name: ServiceOrder.name, schema: ServiceOrderSchema },
      { name: Contract.name, schema: ContractSchema }
    ]),
    ServiceOrdersModule
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
