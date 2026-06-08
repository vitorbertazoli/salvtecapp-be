import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { TimekeepingEntry, TimekeepingEntrySchema } from './schemas/timekeeping-entry.schema';
import { TimekeepingController } from './timekeeping.controller';
import { TimekeepingService } from './timekeeping.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: TimekeepingEntry.name, schema: TimekeepingEntrySchema }]), UsersModule],
  controllers: [TimekeepingController],
  providers: [TimekeepingService],
  exports: [TimekeepingService]
})
export class TimekeepingModule {}
