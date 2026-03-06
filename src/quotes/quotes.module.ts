import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountsModule } from '../accounts/accounts.module';
import { QuoteToServiceOrderModule } from '../quote-to-service-order/quote-to-service-order.module';
import { EmailModule } from '../utils/email.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { PublicQuotesController } from './public-quotes.controller';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { Quote, QuoteSchema } from './schemas/quote.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quote.name, schema: QuoteSchema }]),
    EmailModule,
    QuoteToServiceOrderModule,
    WebsocketModule,
    AccountsModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10
      }
    ])
  ],
  controllers: [QuotesController, PublicQuotesController],
  providers: [QuotesService],
  exports: [QuotesService]
})
export class QuotesModule {}
