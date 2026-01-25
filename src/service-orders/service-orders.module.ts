import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuoteToServiceOrderModule } from '../quote-to-service-order/quote-to-service-order.module';
import { ServiceOrder, ServiceOrderSchema } from './schemas/service-order.schema';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ServiceOrder.name, schema: ServiceOrderSchema }]), QuoteToServiceOrderModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService]
})
export class ServiceOrdersModule {}
