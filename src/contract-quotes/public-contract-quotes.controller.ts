import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ContractQuotesService } from './contract-quotes.service';
import { ApproveContractQuoteDto } from './dto/approve-contract-quote.dto';

@Controller('public/contract-quotes')
@UseGuards(ThrottlerGuard)
export class PublicContractQuotesController {
  constructor(private readonly contractQuotesService: ContractQuotesService) {}

  @Get('approve/:token')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getContractQuoteForApproval(@Param('token') token: string) {
    const contractQuote = await this.contractQuotesService.getContractQuoteByToken(token);

    return {
      id: contractQuote._id,
      startDate: contractQuote.startDate,
      expireDate: contractQuote.expireDate,
      firstPaymentDate: contractQuote.firstPaymentDate,
      maintenanceFrequency: contractQuote.maintenanceFrequency,
      paymentFrequency: contractQuote.paymentFrequency,
      terms: contractQuote.terms,
      value: contractQuote.value,
      status: contractQuote.status,
      customer: contractQuote.customer,
      services: contractQuote.services || [],
      files: contractQuote.files || [],
      createdAt: (contractQuote as any).createdAt,
      account: contractQuote.account,
      createdBy: contractQuote.createdBy
    };
  }

  @Post('approve/:token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async approveContractQuote(@Param('token') token: string, @Body() approvalData: ApproveContractQuoteDto) {
    return this.contractQuotesService.approveContractQuoteByToken(token, approvalData);
  }
}
