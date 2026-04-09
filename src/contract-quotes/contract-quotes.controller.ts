import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { Types } from 'mongoose';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { GetAccountId, GetUser, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContractQuotesService } from './contract-quotes.service';
import { ApproveContractQuoteDto } from './dto/approve-contract-quote.dto';
import { CreateContractQuoteDto } from './dto/create-contract-quote.dto';
import { UpdateContractQuoteDto } from './dto/update-contract-quote.dto';

const allowedFileMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]);

@Controller('contract-quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractQuotesController {
  constructor(private readonly contractQuotesService: ContractQuotesService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR')
  async create(@Body() dto: CreateContractQuoteDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const contractQuoteData = {
      ...dto,
      account: accountId,
      customer: new Types.ObjectId(dto.customer),
      ...(dto.services && {
        services: dto.services.map((service) => ({
          ...service,
          service: new Types.ObjectId(service.service)
        }))
      }),
      status: 'draft',
      files: [],
      createdBy: new Types.ObjectId(userId),
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.contractQuotesService.create(contractQuoteData);
  }

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = '',
    @Query('customer') customerId: string = '',
    @GetAccountId() accountId: Types.ObjectId
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const statuses = status
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return this.contractQuotesService.findByAccount(
      accountId,
      pageNum,
      limitNum,
      search,
      statuses.length > 0 ? statuses : undefined,
      customerId || undefined
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.contractQuotesService.findByIdAndAccount(id, accountId);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async update(@Param('id') id: string, @Body() dto: UpdateContractQuoteDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    const contractQuoteData = {
      ...dto,
      ...(dto.customer && { customer: new Types.ObjectId(dto.customer) }),
      ...(dto.services && {
        services: dto.services.map((service) => ({
          ...service,
          ...(service.service && { service: new Types.ObjectId(service.service) })
        }))
      }),
      updatedBy: new Types.ObjectId(userId)
    } as any;

    return this.contractQuotesService.updateByAccount(id, contractQuoteData, accountId, new Types.ObjectId(userId));
  }

  @Put(':id/send')
  @Roles('ADMIN', 'SUPERVISOR')
  async send(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.contractQuotesService.sendContractQuote(id, accountId, new Types.ObjectId(userId));
  }

  @Put(':id/decide')
  @Roles('ADMIN', 'SUPERVISOR')
  async decide(@Param('id') id: string, @Body() dto: ApproveContractQuoteDto, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.contractQuotesService.approveOrRejectByAccount(id, accountId, new Types.ObjectId(userId), dto.approved, dto.notes);
  }

  @Post(':id/files')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          const destination = './uploads/contract-quote-files';
          mkdirSync(destination, { recursive: true });
          callback(null, destination);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const quoteId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
          callback(null, `contract-quote-${quoteId}-${uniqueSuffix}${extname(file.originalname)}`);
        }
      }),
      fileFilter: (req, file, callback) => {
        if (!allowedFileMimeTypes.has(file.mimetype)) {
          return callback(new Error('Unsupported file type'), false);
        }

        callback(null, true);
      },
      limits: {
        fileSize: 20 * 1024 * 1024
      }
    })
  )
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetAccountId() accountId: Types.ObjectId,
    @GetUser('id') userId: string
  ) {
    if (!file) {
      throw new BadRequestException('contractQuotes.errors.noFileUploaded');
    }

    return this.contractQuotesService.addFileByAccount(id, file, new Types.ObjectId(userId), accountId);
  }

  @Delete(':id/files/:fileId')
  @Roles('ADMIN', 'SUPERVISOR')
  async deleteFile(@Param('id') id: string, @Param('fileId') fileId: string, @GetAccountId() accountId: Types.ObjectId, @GetUser('id') userId: string) {
    return this.contractQuotesService.deleteFileByAccount(id, fileId, accountId, new Types.ObjectId(userId));
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  async remove(@Param('id') id: string, @GetAccountId() accountId: Types.ObjectId) {
    return this.contractQuotesService.deleteByAccount(id, accountId);
  }
}
