import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersModule } from '../customers/customers.module';
import { CustomerVehiclesController } from './customer-vehicles.controller';
import { CustomerVehiclesService } from './customer-vehicles.service';
import { CustomerVehicle, CustomerVehicleSchema } from './schemas/customer-vehicle.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: CustomerVehicle.name, schema: CustomerVehicleSchema }]), CustomersModule],
  controllers: [CustomerVehiclesController],
  providers: [CustomerVehiclesService],
  exports: [CustomerVehiclesService]
})
export class CustomerVehiclesModule {}