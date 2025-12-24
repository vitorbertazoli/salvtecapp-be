import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Event, EventSchema } from '../events/schemas/event.schema';
import { Quote, QuoteSchema } from '../quotes/schemas/quote.schema';
import { ServiceOrder, ServiceOrderSchema } from '../service-orders/schemas/service-order.schema';
import { Technician, TechnicianSchema } from '../technicians/schemas/technician.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Technician.name, schema: TechnicianSchema },
      { name: Quote.name, schema: QuoteSchema },
      { name: ServiceOrder.name, schema: ServiceOrderSchema },
      { name: Event.name, schema: EventSchema }
    ])
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService]
})
export class DashboardModule {}