import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { QuotesService } from './quotes.service';

@Controller('public/quotes')
@UseGuards(ThrottlerGuard)
export class PublicQuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('approve/:token')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getQuoteForApproval(@Param('token') token: string) {
    const quote = await this.quotesService.getQuoteByToken(token);
    if (!quote) {
      throw new NotFoundException('quotes.errors.quoteNotFoundOrTokenExpired');
    }

    const services = (quote.services || []).map((line: any) => ({
      quantity: line.quantity,
      unitValue: line.unitValue,
      service: line.service
        ? {
            _id: line.service._id,
            name: line.service.name,
            description: line.service.description,
            value: line.service.value
          }
        : null
    }));

    const products = (quote.products || []).map((line: any) => ({
      quantity: line.quantity,
      unitValue: line.unitValue,
      product: line.product
        ? {
            _id: line.product._id,
            name: line.product.name,
            description: line.product.description,
            maker: line.product.maker,
            model: line.product.model,
            sku: line.product.sku,
            value: line.product.value
          }
        : null
    }));

    // Return formatted quote data for the frontend
    return {
      id: quote._id,
      description: quote.description,
      customer: quote.customer,
      services,
      products,
      equipments: quote.equipments || [],
      totalValue: quote.totalValue,
      discount: quote.discount,
      otherDiscounts: quote.otherDiscounts || [],
      status: quote.status,
      validUntil: quote.validUntil,
      issuedAt: quote.issuedAt,
      createdAt: quote.createdAt,
      account: quote.account,
      createdBy: quote.createdBy
    };
  }

  @Post('approve/:token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async approveQuote(@Param('token') token: string, @Body() approvalData: { approved: boolean; notes?: string }) {
    const result = await this.quotesService.approveQuoteByToken(token, approvalData);
    if (!result) {
      throw new NotFoundException('quotes.errors.quoteNotFoundOrTokenExpired');
    }

    return result;
  }
}
