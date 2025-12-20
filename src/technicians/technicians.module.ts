import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from '../accounts/accounts.module';
import { Technician, TechnicianSchema } from './schemas/technician.schema';
import { TechniciansController } from './technicians.controller';
import { TechniciansService } from './technicians.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Technician.name, schema: TechnicianSchema }]), AccountsModule],
  controllers: [TechniciansController],
  providers: [TechniciansService],
  exports: [TechniciansService]
})
export class TechniciansModule { }
