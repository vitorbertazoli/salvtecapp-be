import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersModule } from 'src/customers/customers.module';
import { AccountsModule } from '../accounts/accounts.module';
import { PaymentsModule } from '../payments/payments.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { Contract, ContractSchema } from './schemas/contract.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Contract.name, schema: ContractSchema }]), AccountsModule, CustomersModule, PaymentsModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService]
})
export class ContractsModule {}
