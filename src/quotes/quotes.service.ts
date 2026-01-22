import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailService } from '../utils/email.service';
import { Quote, QuoteDocument } from './schemas/quote.schema';

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    private emailService: EmailService
  ) {}

  async create(quoteData: Partial<Quote>): Promise<Quote> {
    const createdQuote = new this.quoteModel(quoteData);
    const savedQuote = await createdQuote.save();
    return savedQuote.toObject() as any;
  }

  async findByAccount(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: string,
    customerId?: string
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
    if (customerId) {
      matchConditions.customer = new Types.ObjectId(customerId);
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

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<QuoteDocument | null> {
    const quote = await this.quoteModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .populate('services.service', 'name')
      .populate('products.product', 'name')
      .exec();

    return quote;
  }

  async updateByAccount(id: string, quoteData: Partial<Quote>, accountId: Types.ObjectId, userId?: Types.ObjectId): Promise<Quote | null> {
    const query = { _id: id, account: accountId };

    // Check current quote status
    const currentQuote = await this.quoteModel.findOne(query).exec();
    if (!currentQuote) {
      return null;
    }

    // If quote has been accepted, do not allow changes
    if (currentQuote.status === 'accepted') {
      throw new BadRequestException('Quote has been accepted and cannot be modified. Use change order process.');
    }

    // If quote has been sent, reset status to draft when updating
    // But allow status changes from 'sent' to 'accepted' (for service order creation)
    const updateData = { ...quoteData };
    if (currentQuote.status === 'sent') {
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

  async deleteByAccount(id: string, accountId: Types.ObjectId): Promise<Quote | null> {
    const query = { _id: id, account: accountId };
    return this.quoteModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.quoteModel.deleteMany({ account: accountId }).exec();
  }

  async sendQuote(id: string, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<{ success: boolean; message: string }> {
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
      return new Intl.DateTimeFormat('pt-BR', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour12: false
      }).format(new Date(date));
    };

    // Calculate totals
    const servicesTotal = quote.services?.reduce((sum: number, service: any) => sum + service.quantity * service.unitValue, 0) || 0;

    const productsTotal = quote.products?.reduce((sum: number, product: any) => sum + product.quantity * product.unitValue, 0) || 0;

    const subtotal = servicesTotal + productsTotal;
    const discountValue = subtotal * ((quote.discount || 0) / 100);
    const totalValue = subtotal - discountValue;

    // Status styling
    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'accepted':
          return 'background-color: #4caf50; color: white;';
        case 'sent':
          return 'background-color: #2196f3; color: white;';
        case 'draft':
        default:
          return 'background-color: #ff9800; color: white;';
      }
    };

    let equipmentHtml = '';
    if (quote.customer?.equipments && quote.customer.equipments.length > 0) {
      equipmentHtml = `
        <h6 style="color: #1976d2; margin: 30px 0 10px 0; font-size: 18px;">Equipamentos</h6>
        <div style="margin-bottom: 20px;">
          ${quote.customer.equipments
            .map(
              (equipment: any) => `
            <span style="display: inline-block; padding: 4px 12px; margin: 2px 4px 2px 0; border: 1px solid #ddd; border-radius: 16px; font-size: 12px; background-color: #f5f5f5;">
              ${equipment.name}${equipment.room ? ` (${equipment.room})` : ''}
            </span>
          `
            )
            .join('')}
        </div>
      `;
    }

    let servicesHtml = '';
    if (quote.services && quote.services.length > 0) {
      servicesHtml = `
        <h6 style="color: #1976d2; margin: 30px 0 10px 0; font-size: 18px;">Serviços</h6>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 600;">Item</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">Quantidade</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">Preço Unitário</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.services
              .map(
                (service: any) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${service.service.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${service.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(service.unitValue)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(service.quantity * service.unitValue)}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="background-color: #f9f9f9; font-weight: 600;">
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;" colspan="3">Total em Serviços:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(servicesTotal)}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    let productsHtml = '';
    if (quote.products && quote.products.length > 0) {
      productsHtml = `
        <h6 style="color: #1976d2; margin: 30px 0 10px 0; font-size: 18px;">Produtos</h6>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 600;">Item</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">Quantidade</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">Preço Unitário</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 600;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.products
              .map(
                (product: any) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">
                  ${product.product.name}
                  ${product.product.maker ? `<br><small style="color: #666;">${product.product.maker} ${product.product.model || ''}</small>` : ''}
                </td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${product.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(product.unitValue)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(product.quantity * product.unitValue)}</td>
              </tr>
            `
              )
              .join('')}
            <tr style="background-color: #f9f9f9; font-weight: 600;">
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;" colspan="3">Total em Produtos:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(productsTotal)}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    let descriptionHtml = '';
    if (quote.description) {
      descriptionHtml = `
        <h6 style="color: #1976d2; margin: 30px 0 10px 0; font-size: 18px;">Descrição</h6>
        <p style="margin-bottom: 20px; line-height: 1.5;">${quote.description}</p>
      `;
    }

    return `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div style="display: flex; align-items: center;">
              <div style="width: 40px; height: 40px; background-color: #1976d2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                <span style="color: white; font-size: 20px;">📄</span>
              </div>
              <div>
                <h1 style="color: #1976d2; margin: 0; font-size: 24px;">Orçamento</h1>
                <p style="color: #666; margin: 0; font-size: 14px;">Detalhes e informações do orçamento</p>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div style="width: 48%;">
              <p style="margin: 5px 0; font-size: 14px;"><strong>ID do Orçamento:</strong> ${quote._id.toString().slice(-8)}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Emitido Em:</strong> ${formatDate(quote.issuedAt)}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Válido Até:</strong> ${formatDate(quote.validUntil)}</p>
            </div>
            <div style="width: 48%;">
              <p style="margin: 5px 0; font-size: 14px;"><strong>Cliente:</strong> ${quote.customer.name}</p>
              <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${quote.customer.email}</p>
            </div>
          </div>

          ${equipmentHtml}
          ${servicesHtml}
          ${productsHtml}
          ${descriptionHtml}

          <div style="margin-top: 30px;">
            <h6 style="color: #1976d2; margin: 0 0 15px 0; font-size: 18px;">Resumo</h6>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Total em Serviços:</span>
                <span>${formatCurrency(servicesTotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <span>Total em Produtos:</span>
                <span>${formatCurrency(productsTotal)}</span>
              </div>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span><strong>Subtotal:</strong></span>
                <span><strong>${formatCurrency(subtotal)}</strong></span>
              </div>
              ${
                quote.discount
                  ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <span>Desconto (${quote.discount}%):</span>
                <span style="color: #d32f2f;">-${formatCurrency(discountValue)}</span>
              </div>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
              `
                  : ''
              }
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 18px; font-weight: bold;">Valor Total:</span>
                <span style="font-size: 18px; font-weight: bold; color: #1976d2;">${formatCurrency(totalValue)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <p style="margin: 5px 0;">Obrigado pelo seu negócio!</p>
          <p style="margin: 5px 0;">Este orçamento é válido até ${formatDate(quote.validUntil)}.</p>
          <p style="margin: 5px 0;">Para aceitar este orçamento, entre em contato conosco.</p>
          <p style="margin: 15px 0 0 0; font-weight: bold;">${quote.account.name}</p>
        </div>
      </div>
    `;
  }
}
