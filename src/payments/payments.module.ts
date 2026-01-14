import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentOrder, PaymentOrderSchema } from './schemas/payment-order.schema';
import { ServiceOrder, ServiceOrderSchema } from '../service-orders/schemas/service-order.schema';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentOrder.name, schema: PaymentOrderSchema },
      { name: ServiceOrder.name, schema: ServiceOrderSchema }
    ]),
    ServiceOrdersModule
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService]
})
export class PaymentsModule {}
