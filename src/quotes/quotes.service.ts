import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model, Types } from 'mongoose';
import { QuoteToServiceOrderService } from '../quote-to-service-order/quote-to-service-order.service';
import { EmailService } from '../utils/email.service';
import { Quote, QuoteDocument } from './schemas/quote.schema';

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    private emailService: EmailService,
    private configService: ConfigService,
    private quoteToServiceOrderService: QuoteToServiceOrderService
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
      .populate('account', 'name logoUrl')
      .populate('customer', 'name email phoneNumbers address type cpf cnpj contactName')
      .populate('services.service', 'name description')
      .populate('products.product', 'name description maker model sku')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (!quote.customer || !(quote.customer as any).email) {
      throw new NotFoundException('Customer email not found');
    }

    // Generate approval token and expiration date (use quote's validUntil date)
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const approvalTokenExpires = new Date(quote.validUntil);

    // Generate HTML email content
    const htmlContent = this.generateQuoteEmailHtml(quote, approvalToken);

    // Send email
    await this.emailService.sendEmail({
      to: (quote.customer as any).email,
      subject: `Orçamento - ${(quote.account as any).name}`,
      html: htmlContent
    });

    // Update quote status to 'sent' and store token
    await this.quoteModel.findOneAndUpdate(
      query,
      {
        status: 'sent',
        approvalToken,
        approvalTokenExpires,
        updatedBy: userId
      },
      { new: true }
    );

    return { success: true, message: 'Quote sent successfully' };
  }

  async approveQuoteByToken(token: string, approvalData: { approved: boolean; notes?: string }): Promise<{ success: boolean; message: string }> {
    // Find quote by token and check if token is still valid
    const quote = await this.quoteModel
      .findOne({
        approvalToken: token,
        approvalTokenExpires: { $gt: new Date() },
        status: { $in: ['sent', 'draft'] } // Only allow approval for sent or draft quotes
      })
      .populate('account', 'name')
      .populate('customer', 'name email')
      .populate('services.service', 'name description')
      .populate('products.product', 'name description maker model sku')
      .exec();

    if (!quote) {
      throw new NotFoundException('Invalid or expired approval token');
    }

    // Update quote status based on approval and clear the token
    if (approvalData.approved) {
      await this.quoteModel.findOneAndUpdate(
        { _id: quote._id },
        {
          approvalToken: null,
          approvalTokenExpires: null,
          notes: approvalData.notes || quote.notes
        },
        { new: true }
      );
      await this.quoteToServiceOrderService.createFromQuote(
        quote._id.toString(),
        'normal', // Default priority
        quote.account._id || quote.account,
        quote.updatedBy
      );
    } else {
      await this.quoteModel.findOneAndUpdate(
        { _id: quote._id },
        {
          status: 'rejected',
          approvalToken: null,
          approvalTokenExpires: null,
          notes: approvalData.notes || quote.notes,
          updatedBy: quote.updatedBy // Keep the same updatedBy
        },
        { new: true }
      );
    }
    const message = approvalData.approved ? 'Quote approved successfully' : 'Quote rejected';

    return {
      success: approvalData.approved,
      message
    };
  }

  async getQuoteByToken(token: string): Promise<any> {
    // Find quote by token and check if token is still valid
    const quote = await this.quoteModel
      .findOne({
        approvalToken: token,
        approvalTokenExpires: { $gt: new Date() }
      })
      .populate('account', 'name')
      .populate('customer', 'name email phoneNumbers address type cpf cnpj contactName')
      .populate('services.service', 'name description')
      .populate('products.product', 'name description maker model sku')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!quote) {
      throw new NotFoundException('Invalid or expired token');
    }

    return quote;
  }

  private generateQuoteEmailHtml(quote: any, approvalToken?: string): string {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour12: false
      }).format(new Date(date));
    };

    const customer = quote.customer;
    const account = quote.account;
    const createdBy = quote.createdBy;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

    // Calculate subtotal before discounts
    let subtotal = quote.totalValue;
    if (quote.discount) {
      subtotal = subtotal / (1 - quote.discount / 100);
    }
    if (quote.otherDiscounts) {
      quote.otherDiscounts.forEach((discount: any) => {
        subtotal += discount.amount;
      });
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orçamento - ${account.name}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 10px;
        }
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin: 0;
        }
        .quote-title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin: 20px 0;
            text-align: center;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-draft { background-color: #ffc107; color: #212529; }
        .status-sent { background-color: #007bff; color: white; }
        .status-accepted { background-color: #28a745; color: white; }
        .status-rejected { background-color: #dc3545; color: white; }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .info-item {
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: bold;
            color: #666;
            font-size: 14px;
        }
        .info-value {
            font-size: 16px;
            margin-top: 2px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .table th, .table td {
            border: 1px solid #dee2e6;
            padding: 12px;
            text-align: left;
        }
        .table th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #495057;
        }
        .table tbody tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .equipment-table {
            margin: 15px 0;
        }
        .equipment-table th, .equipment-table td {
            padding: 8px 12px;
            font-size: 14px;
        }
        .total-section {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-top: 20px;
        }
        .discount-info {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 15px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .dates-info {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .description {
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
        }
        @media (max-width: 600px) {
            .table {
                font-size: 14px;
            }
            .table th, .table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="company-name">${account.name}</h1>
            <h2 class="quote-title">Orçamento</h2>
        </div>

        <div class="dates-info">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 48%; vertical-align: top; padding-right: 20px;">
                        <div class="info-item">
                            <div class="info-label">Data de Emissão:</div>
                            <div class="info-value">${formatDate(quote.issuedAt)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Válido Até:</div>
                            <div class="info-value">${formatDate(quote.validUntil)}</div>
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h3 class="section-title">Informações do Cliente</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 48%; vertical-align: top; padding-right: 20px;">
                        <div class="info-item">
                            <div class="info-label">Nome:</div>
                            <div class="info-value">${customer.name}</div>
                        </div>
                        ${
                          customer.email
                            ? `
                        <div class="info-item">
                            <div class="info-label">Email:</div>
                            <div class="info-value">${customer.email}</div>
                        </div>
                        `
                            : ''
                        }
                        ${
                          customer.contactName
                            ? `
                        <div class="info-item">
                            <div class="info-label">Nome do Contato:</div>
                            <div class="info-value">${customer.contactName}</div>
                        </div>
                        `
                            : ''
                        }
                        <div class="info-item">
                            <div class="info-label">Tipo:</div>
                            <div class="info-value">${customer.type === 'residential' ? 'Residencial' : 'Comercial'}</div>
                        </div>
                        ${
                          customer.cpf
                            ? `
                        <div class="info-item">
                            <div class="info-label">CPF:</div>
                            <div class="info-value">${customer.cpf}</div>
                        </div>
                        `
                            : ''
                        }
                        ${
                          customer.cnpj
                            ? `
                        <div class="info-item">
                            <div class="info-label">CNPJ:</div>
                            <div class="info-value">${customer.cnpj}</div>
                        </div>
                        `
                            : ''
                        }
                        ${
                          customer.phoneNumbers && customer.phoneNumbers.length > 0
                            ? `
                        <div class="info-item">
                            <div class="info-label">Telefones:</div>
                            <div class="info-value">${customer.phoneNumbers.join(', ')}</div>
                        </div>
                        `
                            : ''
                        }
                    </td>
                    <td style="width: 48%; vertical-align: top; padding-left: 20px;">
                        ${
                          customer.address
                            ? `
                        <div class="info-item">
                            <div class="info-label">Endereço:</div>
                            <div class="info-value">
                                ${customer.address.street ? customer.address.street : ''} ${customer.address.number ? ', ' + customer.address.number : ''}<br>
                                ${customer.address.complement ? customer.address.complement + '<br>' : ''}
                                ${customer.address.neighborhood ? customer.address.neighborhood + ' - ' : ''}
                                ${customer.address.city ? customer.address.city : ''} ${customer.address.state ? '- ' + customer.address.state : ''}<br>
                                ${customer.address.zipCode ? 'CEP: ' + customer.address.zipCode : ''}
                                ${customer.address.country && customer.address.country !== 'Brazil' ? '<br>' + customer.address.country : ''}
                            </div>
                        </div>
                        `
                            : '<div class="info-item"><div class="info-label">Endereço:</div><div class="info-value">Não informado</div></div>'
                        }
                    </td>
                </tr>
            </table>
        </div>

        ${
          quote.equipments && quote.equipments.length > 0
            ? `
        <div class="section">
            <h3 class="section-title">Equipamentos</h3>
            <table class="table equipment-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Sala</th>
                        <th>BTUs</th>
                        <th>Tipo</th>
                        <th>Subtipo</th>
                        <th>Fabricante</th>
                        <th>Modelo</th>
                    </tr>
                </thead>
                <tbody>
                    ${quote.equipments
                      .map(
                        (equipment: any) => `
                        <tr>
                            <td>${equipment.name}</td>
                            <td>${equipment.room || '-'}</td>
                            <td>${equipment.btus || '-'}</td>
                            <td>${equipment.type}</td>
                            <td>${equipment.subType || '-'}</td>
                            <td>${equipment.maker || '-'}</td>
                            <td>${equipment.model || '-'}</td>
                        </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        </div>
        `
            : ''
        }

        ${
          quote.services && quote.services.length > 0
            ? `
        <div class="section">
            <h3 class="section-title">Serviços</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Serviço</th>
                        <th>Descrição</th>
                        <th>Quantidade</th>
                        <th>Valor Unitário</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${quote.services
                      .map(
                        (serviceItem: any) => `
                        <tr>
                            <td>${serviceItem.service?.name || 'Serviço'}</td>
                            <td>${serviceItem.service?.description || '-'}</td>
                            <td>${serviceItem.quantity}</td>
                            <td>${formatCurrency(serviceItem.unitValue)}</td>
                            <td>${formatCurrency(serviceItem.quantity * serviceItem.unitValue)}</td>
                        </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        </div>
        `
            : ''
        }

        ${
          quote.products && quote.products.length > 0
            ? `
        <div class="section">
            <h3 class="section-title">Produtos</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Descrição</th>
                        <th>Fabricante</th>
                        <th>Modelo</th>
                        <th>SKU</th>
                        <th>Quantidade</th>
                        <th>Valor Unitário</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${quote.products
                      .map(
                        (productItem: any) => `
                        <tr>
                            <td>${productItem.product?.name || 'Produto'}</td>
                            <td>${productItem.product?.description || '-'}</td>
                            <td>${productItem.product?.maker || '-'}</td>
                            <td>${productItem.product?.model || '-'}</td>
                            <td>${productItem.product?.sku || '-'}</td>
                            <td>${productItem.quantity}</td>
                            <td>${formatCurrency(productItem.unitValue)}</td>
                            <td>${formatCurrency(productItem.quantity * productItem.unitValue)}</td>
                        </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        </div>
        `
            : ''
        }

        ${
          quote.description
            ? `
        <div class="section">
            <h3 class="section-title">Descrição</h3>
            <div class="description">${quote.description}</div>
        </div>
        `
            : ''
        }

        <div class="total-section">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-size: 16px; border-bottom: 1px solid #dee2e6;">Subtotal:</td>
                    <td style="padding: 8px 0; font-size: 16px; text-align: right; border-bottom: 1px solid #dee2e6;">${formatCurrency(subtotal)}</td>
                </tr>

                ${
                  quote.discount
                    ? `
                <tr>
                    <td style="padding: 8px 0; font-size: 16px; border-bottom: 1px solid #dee2e6;">Desconto (${quote.discount}%):</td>
                    <td style="padding: 8px 0; font-size: 16px; text-align: right; border-bottom: 1px solid #dee2e6;">-${formatCurrency((subtotal * quote.discount) / 100)}</td>
                </tr>
                `
                    : ''
                }

                ${
                  quote.otherDiscounts && quote.otherDiscounts.length > 0
                    ? `
                    ${quote.otherDiscounts
                      .map(
                        (discount: any) => `
                <tr>
                    <td style="padding: 8px 0; font-size: 16px; border-bottom: 1px solid #dee2e6;">${discount.description}:</td>
                    <td style="padding: 8px 0; font-size: 16px; text-align: right; border-bottom: 1px solid #dee2e6;">-${formatCurrency(discount.amount)}</td>
                </tr>
                `
                      )
                      .join('')}
                `
                    : ''
                }

                <tr>
                    <td style="padding: 15px 0 8px 0; font-size: 20px; font-weight: bold; border-top: 2px solid #007bff;">Total:</td>
                    <td style="padding: 15px 0 8px 0; font-size: 20px; font-weight: bold; text-align: right; border-top: 2px solid #007bff;">${formatCurrency(quote.totalValue)}</td>
                </tr>
            </table>
        </div>

        ${
          createdBy
            ? `
        <div class="section">
            <div style="text-align: center; color: #666; font-size: 14px;">
                Orçamento preparado por: <strong>${createdBy.firstName} ${createdBy.lastName}</strong>
            </div>
        </div>
        `
            : ''
        }

        <div class="footer">
            ${
              approvalToken
                ? `
            <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
                <p style="margin: 0; font-size: 16px; font-weight: bold;">Aprovar Orçamento</p>
                <p style="margin: 10px 0 0 0;">
                    <a href="${frontendUrl}/public/quotes/approval/${approvalToken}" style="background-color: white; color: #007bff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Clique aqui para aprovar</a>
                </p>
            </div>
            `
                : ''
            }
            <p>Obrigado pelo seu interesse nos nossos serviços!</p>
            <p>Este orçamento é válido até ${formatDate(quote.validUntil)}.</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }
}
