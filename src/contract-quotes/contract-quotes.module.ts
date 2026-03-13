import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ContractsModule } from '../contracts/contracts.module';
import { CustomersModule } from '../customers/customers.module';
import { PaymentsModule } from '../payments/payments.module';
import { EmailModule } from '../utils/email.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ContractQuotesController } from './contract-quotes.controller';
import { ContractQuotesService } from './contract-quotes.service';
import { PublicContractQuotesController } from './public-contract-quotes.controller';
import { ContractQuotes, ContractQuotesSchema } from './schemas/contract-quotes.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ContractQuotes.name, schema: ContractQuotesSchema }]),
    EmailModule,
    ContractsModule,
    PaymentsModule,
    CustomersModule,
    WebsocketModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10
      }
    ])
  ],
  controllers: [ContractQuotesController, PublicContractQuotesController],
  providers: [ContractQuotesService],
  exports: [ContractQuotesService]
})
export class ContractQuotesModule {}
