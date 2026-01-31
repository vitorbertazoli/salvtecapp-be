import { BadRequestException, Body, Controller, Get, HttpException, Param, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Types } from 'mongoose';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { GetAccountId, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../utils/email.service';
import { AccountsService } from './accounts.service';
import { UpdateAccountDto } from './dto/update-account.dto';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly emailService: EmailService
  ) {}

  @Get('customizations')
  @Roles('ADMIN', 'SUPERVISOR', 'TECHNICIAN')
  async getCustomizations(@GetAccountId() accountid: Types.ObjectId) {
    const customizations = await this.accountsService.getCustomizations(accountid);
    return { customizations: customizations || '' };
  }

  @Get(':id')
  @Roles('ADMIN')
  async findById(@Param('id') id: string, @GetAccountId() accountid: Types.ObjectId) {
    if (id !== accountid.toString()) {
      return new HttpException('accounts.errors.accessDenied', 403);
    }

    return this.accountsService.findOne(accountid);
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() accountData: UpdateAccountDto, @GetAccountId() accountid: Types.ObjectId) {
    if (id !== accountid.toString()) {
      return new HttpException('accounts.errors.accessDenied', 403);
    }

    return this.accountsService.update(id, accountData);
  }

  @Post(':id/logo')
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, uniqueSuffix + extname(file.originalname));
        }
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          throw new BadRequestException('accounts.errors.onlyImageFilesAllowed');
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
      }
    })
  )
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: UploadedFile, @GetAccountId() accountid: Types.ObjectId) {
    if (id !== accountid.toString()) {
      return new HttpException('accounts.errors.accessDenied', 403);
    }

    if (!file) {
      throw new HttpException('accounts.errors.noFileUploaded', 400);
    }

    // Save the file and get the URL
    const logoUrl = `/uploads/logos/${file.filename}`;

    // Update the account with the new logo URL
    await this.accountsService.update(id, { logoUrl });

    return { logoUrl };
  }
}
