import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuotesModule } from '../quotes/quotes.module';
import { ServiceOrder, ServiceOrderSchema } from './schemas/service-order.schema';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ServiceOrder.name, schema: ServiceOrderSchema }]),
    forwardRef(() => QuotesModule)
  ],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService]
})
export class ServiceOrdersModule {}
