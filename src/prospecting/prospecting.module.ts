import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProspectingController } from './prospecting.controller';
import { ProspectingService } from './prospecting.service';
import { ProspectBusiness, ProspectBusinessSchema } from './schemas/prospect-business.schema';
import { ProspectCallLog, ProspectCallLogSchema } from './schemas/prospect-call-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProspectBusiness.name, schema: ProspectBusinessSchema },
      { name: ProspectCallLog.name, schema: ProspectCallLogSchema }
    ])
  ],
  controllers: [ProspectingController],
  providers: [ProspectingService],
  exports: [ProspectingService]
})
export class ProspectingModule {}
