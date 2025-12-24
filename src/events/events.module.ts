import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { Technician, TechnicianSchema } from '../technicians/schemas/technician.schema';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event, EventSchema } from './schemas/event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Technician.name, schema: TechnicianSchema },
    ]),
    ServiceOrdersModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}