import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuoteToServiceOrderModule } from '../quote-to-service-order/quote-to-service-order.module';
import { Technician, TechnicianSchema } from '../technicians/schemas/technician.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ServiceOrder, ServiceOrderSchema } from './schemas/service-order.schema';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceOrder.name, schema: ServiceOrderSchema },
      { name: Technician.name, schema: TechnicianSchema },
      { name: User.name, schema: UserSchema }
    ]),
    QuoteToServiceOrderModule
  ],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [ServiceOrdersService]
})
export class ServiceOrdersModule {}
