import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehicleUsage, VehicleUsageSchema } from './schemas/vehicle-usages.schema';
import { VehicleUsagesController } from './vehicle-usages.controller';
import { VehicleUsagesService } from './vehicle-usages.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: VehicleUsage.name, schema: VehicleUsageSchema }])],
  controllers: [VehicleUsagesController],
  providers: [VehicleUsagesService]
})
export class VehicleUsagesModule {}
