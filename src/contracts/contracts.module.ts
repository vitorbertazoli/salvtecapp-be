import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from '../accounts/accounts.module';
import { Contract, ContractSchema } from './schemas/contract.schema';
import { CustomersModule } from 'src/customers/customers.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Contract.name, schema: ContractSchema }]), AccountsModule, CustomersModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService]
})
export class ContractsModule {}
