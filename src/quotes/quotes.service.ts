import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { Quote, QuoteDocument } from './schemas/quote.schema';
import { EmailService } from '../utils/email.service';

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    private emailService: EmailService
  ) { }

  async create(quoteData: Partial<Quote>): Promise<Quote> {
    const createdQuote = new this.quoteModel(quoteData);
    const savedQuote = await createdQuote.save();
    return savedQuote.toObject() as any;
  }

  async findAll(): Promise<Quote[]> {
    return this.quoteModel.find().exec();
  }

  async findByAccount(
    accountId: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: string
  ): Promise<{
    quotes: Quote[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions: any = { account: accountId };
    if (status) {
      matchConditions.status = status;
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchConditions },
      // Convert customer string ID to ObjectId for lookup
      {
        $addFields: {
          customer: {
            $cond: {
              if: { $and: [{ $ne: ['$customer', null] }, { $ne: ['$customer', ''] }] },
              then: { $toObjectId: '$customer' },
              else: null
            }
          }
        }
      },
      // Join with customers collection
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ];

    // Add search filter if search term is provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [{ description: { $regex: search, $options: 'i' } }, { 'customer.name': { $regex: search, $options: 'i' } }]
        }
      });
    }

    // Add sorting, pagination
    pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit });

    // Get total count
    let total: number;
    if (!search) {
      total = await this.quoteModel.countDocuments(matchConditions).exec();
    } else {
      const countPipeline = [...pipeline];
      countPipeline.splice(countPipeline.length - 2, 2, { $count: 'total' });
      const countResult = await this.quoteModel.aggregate(countPipeline).exec();
      total = countResult.length > 0 ? countResult[0].total : 0;
    }

    const quotes = await this.quoteModel.aggregate(pipeline).exec();

    const totalPages = Math.ceil(total / limit);

    return {
      quotes,
      total,
      page,
      limit,
      totalPages
    };
  }

  async findOne(id: string): Promise<Quote | null> {
    return this.quoteModel.findById(id).exec();
  }

  async findByIdAndAccount(id: string, accountId: ObjectId): Promise<QuoteDocument | null> {
    const quote = await this.quoteModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .populate('services.service', 'name')
      .populate('products.product', 'name')
      .exec();

    return quote;
  }

  async update(id: string, quoteData: Partial<Quote>): Promise<Quote | null> {
    // Check current quote status
    const currentQuote = await this.quoteModel.findById(id).exec();
    if (!currentQuote) {
      return null;
    }

    // If quote has been sent or accepted, reset status to draft when updating
    // But allow status change from 'sent' to 'accepted' (for service order creation)
    const updateData = { ...quoteData };
    if (currentQuote.status === 'sent' || currentQuote.status === 'accepted') {
      // Allow status change from 'sent' to 'accepted', but reset to 'draft' for other updates
      if (!(quoteData.status === 'accepted' && currentQuote.status === 'sent')) {
        updateData.status = 'draft';
      }
    }

    return this.quoteModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async updateByAccount(id: string, quoteData: Partial<Quote>, accountId: ObjectId): Promise<Quote | null> {
    const query = { _id: id, account: accountId };

    // Check current quote status
    const currentQuote = await this.quoteModel.findOne(query).exec();
    if (!currentQuote) {
      return null;
    }

    // If quote has been sent or accepted, reset status to draft when updating
    // But allow status changes from 'sent' to 'accepted' (for service order creation)
    const updateData = { ...quoteData };
    if (currentQuote.status === 'sent' || currentQuote.status === 'accepted') {
      // Allow status change from 'sent' to 'accepted', but reset to 'draft' for other updates
      if (!(quoteData.status === 'accepted' && currentQuote.status === 'sent')) {
        updateData.status = 'draft';
      }
    }

    const updatedQuote = await this.quoteModel
      .findOneAndUpdate(query, updateData, { new: true })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .exec();

    return updatedQuote;
  }

  async delete(id: string): Promise<Quote | null> {
    return this.quoteModel.findByIdAndDelete(id).exec();
  }

  async deleteByAccount(id: string, accountId: string): Promise<Quote | null> {
    const query = { _id: id, account: accountId };
    return this.quoteModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: string): Promise<any> {
    return this.quoteModel.deleteMany({ account: accountId }).exec();
  }

  async sendQuote(id: string, accountId: any, userId: string) {
    const query = { _id: id, account: accountId };

    // Find the quote with all populated data
    const quote = await this.quoteModel
      .findOne(query)
      .populate('account', 'name')
      .populate('customer', 'name email')
      .populate('services.service', 'name description')
      .populate('products.product', 'name description maker model sku')
      .exec();

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (!quote.customer || !(quote.customer as any).email) {
      throw new Error('Customer email not found');
    }

    // Generate HTML email content
    const htmlContent = this.generateQuoteEmailHtml(quote);

    // Send email
    await this.emailService.sendEmail({
      to: (quote.customer as any).email,
      subject: `Orçamento - ${(quote.account as any).name}`,
      html: htmlContent
    });

    // Update quote status to 'sent'
    await this.quoteModel.findOneAndUpdate(
      query,
      {
        status: 'sent',
        updatedBy: userId
      },
      { new: true }
    );

    return { success: true, message: 'Quote sent successfully' };
  }

  private generateQuoteEmailHtml(quote: any): string {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
    };

    let servicesHtml = '';
    if (quote.services && quote.services.length > 0) {
      servicesHtml = `
        <h3>Serviços</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Serviço</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantidade</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Valor Unitário</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.services.map((service: any) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${service.service.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${service.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(service.unitValue)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(service.quantity * service.unitValue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    let productsHtml = '';
    if (quote.products && quote.products.length > 0) {
      productsHtml = `
        <h3>Produtos</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Produto</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Quantidade</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Valor Unitário</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.products.map((product: any) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">
                  ${product.product.name}
                  ${product.product.maker ? `<br><small>${product.product.maker} ${product.product.model || ''}</small>` : ''}
                </td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${product.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(product.unitValue)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(product.quantity * product.unitValue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const subtotal = quote.totalValue / (1 - (quote.discount || 0) / 100);
    const discountValue = subtotal - quote.totalValue;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1976d2; margin: 0;">${quote.account.name}</h1>
          <h2 style="color: #333; margin: 10px 0;">Orçamento</h2>
        </div>

        <div style="margin-bottom: 30px;">
          <div style="display: inline-block; width: 48%; vertical-align: top;">
            <h3>Cliente</h3>
            <p><strong>${quote.customer.name}</strong></p>
            <p>${quote.customer.email}</p>
          </div>
          <div style="display: inline-block; width: 48%; vertical-align: top; text-align: right;">
            <h3>Detalhes do Orçamento</h3>
            <p><strong>Data de Emissão:</strong> ${formatDate(quote.issuedAt)}</p>
            <p><strong>Validade:</strong> ${formatDate(quote.validUntil)}</p>
            ${quote.description ? `<p><strong>Descrição:</strong> ${quote.description}</p>` : ''}
          </div>
        </div>

        ${servicesHtml}
        ${productsHtml}

        <div style="text-align: right; margin-top: 20px;">
          <table style="float: right; width: 300px;">
            <tr>
              <td style="text-align: right; padding: 5px;"><strong>Subtotal:</strong></td>
              <td style="text-align: right; padding: 5px;">${formatCurrency(subtotal)}</td>
            </tr>
            ${quote.discount ? `
            <tr>
              <td style="text-align: right; padding: 5px;"><strong>Desconto (${quote.discount}%):</strong></td>
              <td style="text-align: right; padding: 5px;">-${formatCurrency(discountValue)}</td>
            </tr>
            ` : ''}
            <tr style="border-top: 2px solid #333;">
              <td style="text-align: right; padding: 5px; font-size: 18px;"><strong>Total:</strong></td>
              <td style="text-align: right; padding: 5px; font-size: 18px;"><strong>${formatCurrency(quote.totalValue)}</strong></td>
            </tr>
          </table>
        </div>

        <div style="clear: both; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
          <p>Obrigado pelo seu negócio!</p>
          <p>Este orçamento é válido até ${formatDate(quote.validUntil)}.</p>
          <p>Para aceitar este orçamento, entre em contato conosco.</p>
        </div>
      </div>
    `;
  }
}
