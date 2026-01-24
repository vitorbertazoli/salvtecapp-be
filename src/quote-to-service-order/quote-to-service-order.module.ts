import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Quote, QuoteSchema } from '../quotes/schemas/quote.schema';
import { ServiceOrder, ServiceOrderSchema } from '../service-orders/schemas/service-order.schema';
import { QuoteToServiceOrderService } from './quote-to-service-order.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: ServiceOrder.name, schema: ServiceOrderSchema }
    ])
  ],
  providers: [QuoteToServiceOrderService],
  exports: [QuoteToServiceOrderService]
})
export class QuoteToServiceOrderModule {}