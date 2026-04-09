import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import { marked } from 'marked';
import { Model, Types } from 'mongoose';
import { join } from 'path';
import { ContractsService } from '../contracts/contracts.service';
import { CustomersService } from '../customers/customers.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../utils/email.service';
import {
    escapeHtml,
    formatCurrencyBRL,
    formatDatePtBr,
    formatMultilineText,
    renderAccountInformationSection,
    renderCompanyHeader,
    renderCustomerInformationSection,
    renderServicesTableSection,
    resolvePublicAssetUrl
} from '../utils/quote-email-template.utils';
import { AppGateway } from '../websocket/app.gateway';
import { ApproveContractQuoteDto } from './dto/approve-contract-quote.dto';
import { ContractQuotes, ContractQuotesDocument } from './schemas/contract-quotes.schema';

type ContractQuotePaymentSimulation = {
  totalInstallments: number;
  netContractValue: number;
  installments: Array<{
    installmentNumber: number;
    totalInstallments: number;
    dueDate: Date | string;
    totalAmount: number;
    periodStart: Date | string;
    periodEnd: Date | string;
  }>;
};

@Injectable()
export class ContractQuotesService {
  constructor(
    @InjectModel(ContractQuotes.name) private contractQuoteModel: Model<ContractQuotesDocument>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly contractsService: ContractsService,
    private readonly paymentsService: PaymentsService,
    private readonly customersService: CustomersService,
    private readonly appGateway: AppGateway
  ) {}

  private normalizeObjectId(value: any): Types.ObjectId {
    if (value instanceof Types.ObjectId) {
      return value;
    }

    if (value && value._id) {
      return new Types.ObjectId(value._id);
    }

    return new Types.ObjectId(value);
  }

  private mapContractQuoteFilesToContractFiles(contractQuote: ContractQuotesDocument) {
    return (contractQuote.files || []).map((file) => ({
      url: file.url,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      createdDate: file.createdDate,
      createdBy: this.normalizeObjectId(file.createdBy)
    }));
  }

  async create(contractQuoteData: Partial<ContractQuotes>): Promise<ContractQuotes> {
    if (contractQuoteData.customer && contractQuoteData.account) {
      const customer = await this.customersService.findByIdAndAccount(contractQuoteData.customer.toString(), contractQuoteData.account);
      if (!customer) {
        throw new NotFoundException('contractQuotes.errors.customerNotFound');
      }
    }

    const createdContractQuote = new this.contractQuoteModel(contractQuoteData);
    const savedContractQuote = await createdContractQuote.save();
    return savedContractQuote.toObject() as any;
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<ContractQuotesDocument | null> {
    return this.contractQuoteModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('customer', 'name email phoneNumbers address type cpf cnpj contactName')
      .populate('services.service', 'name description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('contract', 'startDate expireDate status value frequency paymentFrequency firstPaymentDate')
      .exec();
  }

  async findByAccount(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    statuses?: string[],
    customerId?: string
  ): Promise<{
    contractQuotes: ContractQuotes[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const matchConditions: any = { account: accountId };
    if (statuses && statuses.length > 0) {
      matchConditions.status = { $in: statuses };
    }
    if (customerId && Types.ObjectId.isValid(customerId)) {
      matchConditions.customer = new Types.ObjectId(customerId);
    }

    const pipeline: any[] = [
      { $match: matchConditions },
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

    if (search) {
      const searchConditions: any[] = [{ terms: { $regex: search, $options: 'i' } }, { 'customer.name': { $regex: search, $options: 'i' } }];

      if (Types.ObjectId.isValid(search)) {
        searchConditions.push({ _id: new Types.ObjectId(search) });
      }

      pipeline.push({
        $match: {
          $or: searchConditions
        }
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit });

    const countPipeline: any[] = [
      { $match: matchConditions },
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

    if (search) {
      const searchConditions: any[] = [{ terms: { $regex: search, $options: 'i' } }, { 'customer.name': { $regex: search, $options: 'i' } }];

      if (Types.ObjectId.isValid(search)) {
        searchConditions.push({ _id: new Types.ObjectId(search) });
      }

      countPipeline.push({
        $match: {
          $or: searchConditions
        }
      });
    }

    countPipeline.push({ $count: 'total' });

    const [contractQuotes, countResult] = await Promise.all([
      this.contractQuoteModel.aggregate(pipeline).exec(),
      this.contractQuoteModel.aggregate(countPipeline).exec()
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      contractQuotes,
      total,
      page,
      limit,
      totalPages
    };
  }

  async updateByAccount(
    id: string,
    contractQuoteData: Partial<ContractQuotes>,
    accountId: Types.ObjectId,
    userId?: Types.ObjectId
  ): Promise<ContractQuotes | null> {
    const query = { _id: id, account: accountId };

    const currentContractQuote = await this.contractQuoteModel.findOne(query).exec();
    if (!currentContractQuote) {
      return null;
    }

    if (currentContractQuote.status === 'accepted') {
      throw new BadRequestException('contractQuotes.errors.quoteAlreadyAccepted');
    }

    if (contractQuoteData.status && ['accepted', 'rejected'].includes(contractQuoteData.status)) {
      throw new BadRequestException('contractQuotes.errors.usePublicApprovalFlow');
    }

    if (contractQuoteData.customer) {
      const customer = await this.customersService.findByIdAndAccount(contractQuoteData.customer.toString(), accountId);
      if (!customer) {
        throw new NotFoundException('contractQuotes.errors.customerNotFound');
      }
    }

    const updateData: any = { ...contractQuoteData };

    if (currentContractQuote.status === 'rejected') {
      // Any update on a rejected quote reopens it as a draft revision.
      updateData.status = 'draft';
      updateData.approvalToken = null;
      updateData.approvalTokenExpires = null;
      updateData.sentAt = null;
      updateData.approvedAt = null;
      updateData.rejectedAt = null;
      updateData.rejectionReason = null;
    }

    if (userId) {
      updateData.updatedBy = userId;
    }

    const updatedContractQuote = await this.contractQuoteModel
      .findOneAndUpdate(query, updateData, { new: true })
      .populate('account', 'name id')
      .populate('customer', 'name email phoneNumbers address type cpf cnpj contactName')
      .populate('services.service', 'name description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('contract', 'startDate expireDate status value frequency paymentFrequency firstPaymentDate')
      .exec();

    return updatedContractQuote;
  }

  async deleteByAccount(id: string, accountId: Types.ObjectId): Promise<ContractQuotes | null> {
    const contractQuote = await this.contractQuoteModel.findOne({ _id: id, account: accountId }).exec();

    if (!contractQuote) {
      return null;
    }

    if (contractQuote.status === 'accepted') {
      throw new BadRequestException('contractQuotes.errors.quoteAlreadyAccepted');
    }

    return this.contractQuoteModel.findOneAndDelete({ _id: id, account: accountId }).exec();
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    const contractQuotes = await this.contractQuoteModel.find({ account: accountId }).select('files.url').lean().exec();
    const fileUrls = contractQuotes.flatMap((contractQuote) => contractQuote.files?.map((file) => file.url) || []);

    await Promise.all(
      fileUrls
        .filter((fileUrl): fileUrl is string => Boolean(fileUrl && fileUrl.startsWith('/uploads/')))
        .map(async (fileUrl) => {
          try {
            await fs.unlink(join(process.cwd(), fileUrl));
          } catch (error) {
            console.error(`Failed to delete contract quote file ${fileUrl}:`, error);
          }
        })
    );

    return this.contractQuoteModel.deleteMany({ account: accountId }).exec();
  }

  async sendContractQuote(id: string, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<{ success: boolean; message: string }> {
    const contractQuote = await this.contractQuoteModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name logoUrl customizations replyToEmail email phoneNumbers phoneNumber')
      .populate('customer', 'name email phoneNumbers address type cpf cnpj contactName')
      .populate('services.service', 'name description')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!contractQuote) {
      throw new NotFoundException('contractQuotes.errors.quoteNotFound');
    }

    if (contractQuote.status === 'accepted') {
      throw new BadRequestException('contractQuotes.errors.quoteAlreadyAccepted');
    }

    if (!contractQuote.customer || !(contractQuote.customer as any).email) {
      throw new NotFoundException('contractQuotes.errors.customerEmailNotFound');
    }

    const approvalToken = crypto.randomBytes(32).toString('hex');
    const approvalTokenExpires = new Date(contractQuote.expireDate);

    if (approvalTokenExpires <= new Date()) {
      throw new BadRequestException('contractQuotes.errors.quoteExpired');
    }

    const paymentSimulation = this.paymentsService.simulateContractPayments({
      startDate: new Date(contractQuote.startDate).toISOString(),
      expireDate: new Date(contractQuote.expireDate).toISOString(),
      firstPaymentDate: new Date(contractQuote.firstPaymentDate).toISOString(),
      paymentFrequency: contractQuote.paymentFrequency,
      value: Number(contractQuote.value || 0)
    });

    const htmlContent = await this.generateContractQuoteEmailHtml(contractQuote, approvalToken, paymentSimulation);

    await this.emailService.sendEmail({
      to: (contractQuote.customer as any).email,
      replyToEmail: (contractQuote.account as any).replyToEmail ? (contractQuote.account as any).replyToEmail : undefined,
      subject: `Proposta de Contrato - ${(contractQuote.account as any).name}`,
      html: htmlContent
    });

    await this.contractQuoteModel.findOneAndUpdate(
      { _id: id, account: accountId },
      {
        status: 'sent',
        approvalToken,
        approvalTokenExpires,
        sentAt: new Date(),
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        updatedBy: userId
      },
      { new: true }
    );

    return {
      success: true,
      message: 'Contract quote sent successfully'
    };
  }

  async getContractQuoteByToken(token: string): Promise<ContractQuotesDocument> {
    const contractQuote = await this.contractQuoteModel
      .findOne({
        approvalToken: token,
        approvalTokenExpires: { $gt: new Date() }
      })
      .populate('account', 'name logoUrl')
      .populate('customer', 'name email phoneNumbers address type cpf cnpj contactName')
      .populate('services.service', 'name description')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!contractQuote) {
      throw new NotFoundException('contractQuotes.errors.invalidToken');
    }

    return contractQuote;
  }

  private async processContractQuoteDecision(
    contractQuote: ContractQuotesDocument,
    accountId: Types.ObjectId,
    actorId: Types.ObjectId,
    approved: boolean,
    notes?: string
  ): Promise<{ success: boolean; message: string; contractId?: string; paymentOrdersCreated?: number }> {
    if (approved) {
      if (contractQuote.contract) {
        throw new BadRequestException('contractQuotes.errors.contractAlreadyCreated');
      }

      const contractData = {
        startDate: contractQuote.startDate,
        expireDate: contractQuote.expireDate,
        status: 'active',
        frequency: contractQuote.paymentFrequency,
        maintenanceFrequency: contractQuote.maintenanceFrequency,
        paymentFrequency: contractQuote.paymentFrequency,
        firstPaymentDate: contractQuote.firstPaymentDate,
        terms: contractQuote.terms,
        files: this.mapContractQuoteFilesToContractFiles(contractQuote),
        value: contractQuote.value,
        customer: this.normalizeObjectId(contractQuote.customer),
        services: (contractQuote.services || []).map((service) => ({
          service: this.normalizeObjectId(service.service),
          quantity: service.quantity,
          unitValue: service.unitValue
        })),
        contractQuote: contractQuote._id,
        account: accountId,
        createdBy: actorId,
        updatedBy: actorId
      } as any;

      const createdContract = await this.contractsService.create(contractData);
      const createdContractId = (createdContract as any)._id?.toString() || (createdContract as any).id;

      if (!createdContractId) {
        throw new BadRequestException('contractQuotes.errors.contractCreationFailed');
      }

      let paymentOrdersCreated = 0;
      try {
        const paymentOrders = await this.paymentsService.createFromContract(accountId, createdContractId, actorId);
        paymentOrdersCreated = paymentOrders.length;
      } catch (error) {
        await this.contractsService.deleteByAccount(createdContractId, accountId);
        throw error;
      }

      await this.contractQuoteModel.findByIdAndUpdate(
        contractQuote._id,
        {
          status: 'accepted',
          contract: new Types.ObjectId(createdContractId),
          approvalToken: null,
          approvalTokenExpires: null,
          approvedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null,
          updatedBy: actorId
        },
        { new: true }
      );

      this.appGateway.broadcastToAccount(accountId.toString(), 'contractQuoteStatusChanged', {
        contractQuoteId: contractQuote._id,
        status: 'accepted',
        contractId: createdContractId
      });

      return {
        success: true,
        message: 'Contract quote approved successfully',
        contractId: createdContractId,
        paymentOrdersCreated
      };
    }

    await this.contractQuoteModel.findByIdAndUpdate(
      contractQuote._id,
      {
        status: 'rejected',
        approvalToken: null,
        approvalTokenExpires: null,
        rejectedAt: new Date(),
        rejectionReason: notes || contractQuote.rejectionReason,
        updatedBy: actorId
      },
      { new: true }
    );

    this.appGateway.broadcastToAccount(accountId.toString(), 'contractQuoteStatusChanged', {
      contractQuoteId: contractQuote._id,
      status: 'rejected'
    });

    return {
      success: false,
      message: 'Contract quote rejected'
    };
  }

  async approveContractQuoteByToken(
    token: string,
    approvalData: ApproveContractQuoteDto
  ): Promise<{ success: boolean; message: string; contractId?: string; paymentOrdersCreated?: number }> {
    const contractQuote = await this.contractQuoteModel
      .findOne({
        approvalToken: token,
        approvalTokenExpires: { $gt: new Date() },
        status: { $in: ['sent', 'draft'] }
      })
      .populate('account', 'name')
      .populate('customer', 'name email')
      .populate('services.service', 'name description')
      .exec();

    if (!contractQuote) {
      throw new NotFoundException('contractQuotes.errors.invalidApprovalToken');
    }

    const accountId = this.normalizeObjectId(contractQuote.account);
    const actorId = this.normalizeObjectId(contractQuote.updatedBy || contractQuote.createdBy);

    return this.processContractQuoteDecision(contractQuote, accountId, actorId, approvalData.approved, approvalData.notes);
  }

  async approveOrRejectByAccount(
    id: string,
    accountId: Types.ObjectId,
    userId: Types.ObjectId,
    approved: boolean,
    notes?: string
  ): Promise<{ success: boolean; message: string; contractId?: string; paymentOrdersCreated?: number }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('contractQuotes.errors.notFound');
    }

    const contractQuote = await this.contractQuoteModel
      .findOne({
        _id: new Types.ObjectId(id),
        account: accountId,
        status: { $in: ['sent', 'draft'] }
      })
      .populate('account', 'name')
      .populate('customer', 'name email')
      .populate('services.service', 'name description')
      .exec();

    if (!contractQuote) {
      throw new NotFoundException('contractQuotes.errors.notFound');
    }

    const resolvedAccountId = this.normalizeObjectId(contractQuote.account);

    return this.processContractQuoteDecision(contractQuote, resolvedAccountId, userId, approved, notes);
  }

  async addFileByAccount(id: string, file: Express.Multer.File, userId: Types.ObjectId, accountId: Types.ObjectId): Promise<ContractQuotes | null> {
    const fileUrl = `/uploads/contract-quote-files/${file.filename}`;
    const fileData = {
      url: fileUrl,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      createdDate: new Date(),
      createdBy: userId
    };

    const updatedContractQuote = await this.contractQuoteModel
      .findOneAndUpdate(
        {
          _id: id,
          account: accountId
        },
        {
          $push: {
            files: fileData
          },
          $set: {
            updatedBy: userId
          }
        },
        { new: true }
      )
      .exec();

    if (!updatedContractQuote) {
      throw new NotFoundException('contractQuotes.errors.quoteNotFound');
    }

    return updatedContractQuote;
  }

  async deleteFileByAccount(id: string, fileId: string, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<ContractQuotes | null> {
    const contractQuote = await this.contractQuoteModel.findOne({ _id: id, account: accountId }).exec();
    if (!contractQuote) {
      throw new NotFoundException('contractQuotes.errors.quoteNotFound');
    }

    const currentFile = contractQuote.files?.find((file) => file._id.toString() === fileId);
    if (!currentFile) {
      throw new NotFoundException('contractQuotes.errors.fileNotFound');
    }

    const updatedContractQuote = await this.contractQuoteModel
      .findOneAndUpdate(
        { _id: id, account: accountId },
        {
          $pull: {
            files: { _id: new Types.ObjectId(fileId) }
          },
          $set: {
            updatedBy: userId
          }
        },
        { new: true }
      )
      .exec();

    if (currentFile.url) {
      try {
        const filePath = join(process.cwd(), currentFile.url.replace(/^\//, ''));
        await fs.unlink(filePath);
      } catch (error) {
        // Keep successful DB operation even if file deletion fails.
        console.error(`Failed to delete file ${currentFile.url}:`, error);
      }
    }

    return updatedContractQuote;
  }

  private async generateContractQuoteEmailHtml(contractQuote: any, approvalToken: string, paymentSimulation?: ContractQuotePaymentSimulation): Promise<string> {
    const account = contractQuote.account || {};
    const customer = contractQuote.customer || {};
    const createdBy = contractQuote.createdBy;

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const approvalUrl = `${frontendUrl}/contract-quote-approval/${approvalToken}`;
    const quoteNumber = contractQuote?._id ? contractQuote._id.toString().slice(-8) : '-';
    const services = contractQuote.services || [];
    const files = contractQuote.files || [];
    const servicesTotal = services.reduce(
      (total: number, serviceItem: any) => total + Number(serviceItem.quantity || 0) * Number(serviceItem.unitValue || 0),
      0
    );

    const frequencyLabels: Record<string, string> = {
      weekly: 'Semanal',
      biweekly: 'Quinzenal',
      monthly: 'Mensal',
      bimonthly: 'Bimestral',
      quarterly: 'Trimestral',
      biannual: 'Semestral',
      annual: 'Anual'
    };

    const statusLabels: Record<string, string> = {
      draft: 'Rascunho',
      sent: 'Enviada',
      accepted: 'Aceita',
      rejected: 'Rejeitada'
    };

    const maintenanceFrequencyLabel = frequencyLabels[contractQuote.maintenanceFrequency] || contractQuote.maintenanceFrequency || '-';
    const paymentFrequencyLabel = frequencyLabels[contractQuote.paymentFrequency] || contractQuote.paymentFrequency || '-';
    const statusLabel = statusLabels[contractQuote.status] || contractQuote.status || '-';
    const installments = paymentSimulation?.installments || [];
    const paymentScheduleSection =
      installments.length > 0
        ? `
    <div class="section">
      <h3 class="section-title">Simulacao do Cronograma de Pagamentos</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Parcela</th>
            <th>Vencimento</th>
            <th>Periodo</th>
            <th style="text-align: right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${installments
            .map(
              (installment) => `
          <tr>
            <td>${installment.installmentNumber}/${installment.totalInstallments}</td>
            <td>${formatDatePtBr(installment.dueDate)}</td>
            <td>${formatDatePtBr(installment.periodStart)} - ${formatDatePtBr(installment.periodEnd)}</td>
            <td style="text-align: right;">${formatCurrencyBRL(installment.totalAmount)}</td>
          </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
        : '';

    const attachmentsSection =
      files.length > 0
        ? `
    <div class="section">
      <h3 class="section-title">Anexos</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${files
          .map((file: any) => {
            const fileUrl = resolvePublicAssetUrl(file.url, frontendUrl) || file.url || '#';
            return `<li style="margin-bottom: 8px;"><a href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(file.originalName || 'Arquivo')}</a></li>`;
          })
          .join('')}
      </ul>
    </div>
    `
        : '';

    const accountCustomizationsHtml = account.customizations ? await marked(account.customizations) : '';
    const customizationsSection = accountCustomizationsHtml
      ? `
    <div class="section">
      <h3 class="section-title">Condicoes da Conta</h3>
      <div class="markdown-content" style="background-color: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 10px 0;">
        ${accountCustomizationsHtml}
      </div>
    </div>
    `
      : '';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Proposta de Contrato - ${escapeHtml(account.name || 'Empresa')}</title>
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
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      text-align: center;
      color: #666;
      font-size: 14px;
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
    ${renderCompanyHeader({ account, title: 'Proposta de Contrato', frontendUrl })}

    <div class="dates-info">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 48%; vertical-align: top; padding-right: 20px;">
            <div class="info-item">
              <div class="info-label">Numero da Proposta:</div>
              <div class="info-value">#${escapeHtml(quoteNumber)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Data de Emissao:</div>
              <div class="info-value">${formatDatePtBr(contractQuote.createdAt || new Date(), true)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Valido Ate:</div>
              <div class="info-value">${formatDatePtBr(contractQuote.expireDate)}</div>
            </div>
          </td>
          <td style="width: 48%; vertical-align: top; padding-left: 20px;">
            <div class="info-item">
              <div class="info-label">Status:</div>
              <div class="info-value">${escapeHtml(statusLabel)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Valor Total:</div>
              <div class="info-value">${formatCurrencyBRL(contractQuote.value)}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="description">${formatMultilineText('Abaixo esta a proposta completa com termos, servicos e o cronograma projetado de pagamentos.')}</div>
    </div>

    ${renderAccountInformationSection(account)}

    ${renderCustomerInformationSection(customer)}

    <div class="section">
      <h3 class="section-title">Detalhes do Contrato</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Inicio do Contrato</td>
            <td>${formatDatePtBr(contractQuote.startDate)}</td>
          </tr>
          <tr>
            <td>Fim do Contrato</td>
            <td>${formatDatePtBr(contractQuote.expireDate)}</td>
          </tr>
          <tr>
            <td>Primeiro Pagamento</td>
            <td>${formatDatePtBr(contractQuote.firstPaymentDate)}</td>
          </tr>
          <tr>
            <td>Frequencia de Manutencao</td>
            <td>${escapeHtml(maintenanceFrequencyLabel)}</td>
          </tr>
          <tr>
            <td>Frequencia de Pagamento</td>
            <td>${escapeHtml(paymentFrequencyLabel)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${renderServicesTableSection(contractQuote.services || [], {
      sectionTitle: 'Servicos Contratados',
      emptyMessage: 'Nenhum servico informado nesta proposta.'
    })}

    ${paymentScheduleSection}

    <div class="section">
      <h3 class="section-title">Resumo Financeiro</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-size: 16px; border-bottom: 1px solid #dee2e6;">Total dos Servicos:</td>
          <td style="padding: 8px 0; font-size: 16px; text-align: right; border-bottom: 1px solid #dee2e6;">${formatCurrencyBRL(servicesTotal)}</td>
        </tr>
        <tr>
          <td style="padding: 15px 0 8px 0; font-size: 20px; font-weight: bold; border-top: 2px solid #007bff;">Valor do Contrato:</td>
          <td style="padding: 15px 0 8px 0; font-size: 20px; font-weight: bold; text-align: right; border-top: 2px solid #007bff;">${formatCurrencyBRL(contractQuote.value)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <h3 class="section-title">Termos e Condicoes</h3>
      <div class="description">${formatMultilineText(contractQuote.terms)}</div>
    </div>

    ${attachmentsSection}

    ${customizationsSection}

    ${
      createdBy
        ? `
    <div class="section">
      <div style="text-align: center; color: #666; font-size: 14px;">
        Proposta preparada por: <strong>${escapeHtml(createdBy.firstName || '')} ${escapeHtml(createdBy.lastName || '')}</strong>
      </div>
    </div>
    `
        : ''
    }

    <div class="footer">
      <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0; font-size: 16px; font-weight: bold;">Aprovar Proposta de Contrato</p>
        <p style="margin: 10px 0 0 0;">
          <a href="${escapeHtml(approvalUrl)}" style="background-color: white; color: #007bff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Clique aqui para abrir e revisar</a>
        </p>
      </div>
      <p>Obrigado pelo seu interesse nos nossos servicos.</p>
      <p>Esta proposta e valida ate ${formatDatePtBr(contractQuote.expireDate)}.</p>
    </div>
  </div>
</body>
</html>
`;
  }
}
