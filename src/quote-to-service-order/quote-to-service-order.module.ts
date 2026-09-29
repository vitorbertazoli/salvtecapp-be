import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerVehiclesModule } from '../customer-vehicles/customer-vehicles.module';
import { CustomersModule } from '../customers/customers.module';
import { ProductsModule } from '../products/products.module';
import { Quote, QuoteSchema } from '../quotes/schemas/quote.schema';
import { ServiceOrder, ServiceOrderSchema } from '../service-orders/schemas/service-order.schema';
import { ServicesModule } from '../services/services.module';
import { QuoteToServiceOrderService } from './quote-to-service-order.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: ServiceOrder.name, schema: ServiceOrderSchema }
    ]),
    CustomerVehiclesModule,
    CustomersModule,
    ProductsModule,
    ServicesModule
  ],
  providers: [QuoteToServiceOrderService],
  exports: [QuoteToServiceOrderService]
})
export class QuoteToServiceOrderModule {}
