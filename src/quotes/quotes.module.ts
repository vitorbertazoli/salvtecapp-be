import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { Quote, QuoteSchema } from './schemas/quote.schema';
import { EmailModule } from '../utils/email.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Quote.name, schema: QuoteSchema }]), EmailModule],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService]
})
export class QuotesModule {}
