import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleUsage, VehicleUsageSchema } from '../vehicle-usages/schemas/vehicle-usages.schema';
import { Vehicle, VehicleSchema } from './schemas/vehicles.schema';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: VehicleUsage.name, schema: VehicleUsageSchema }
    ])
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService]
})
export class VehiclesModule {}
