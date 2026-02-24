import { BadRequestException, Body, Controller, NotFoundException, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { Types } from 'mongoose';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RolesService } from '../roles/roles.service';
import { RoleDocument } from '../roles/schemas/role.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { EmailService } from '../utils/email.service';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountDocument } from './schemas/account.schema';

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

@Controller('public-accounts')
@UseGuards(ThrottlerGuard)
export class PublicAccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly emailService: EmailService
  ) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
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
  async create(
    @Body()
    createAccountDto: CreateAccountDto,
    @UploadedFile() logo?: UploadedFile
  ) {
    // Convert account name to lowercase and replace spaces/special chars with dashes
    const accountName = createAccountDto.name.trim();

    // Check if account name already exists
    const existingAccount = await this.accountsService.findByAccountName(accountName);
    if (existingAccount) {
      throw new BadRequestException('accounts.errors.accountNameExists');
    }

    // Check if user email already exists
    const existingUser = await this.usersService.findOneByEmail(createAccountDto.email);
    if (existingUser) {
      throw new BadRequestException('accounts.errors.userEmailExists');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create account
    const account = (await this.accountsService.create({
      name: accountName,
      plan: createAccountDto.plan,
      logoUrl: logo ? `/uploads/logos/${logo.filename}` : undefined,
      status: 'pending',
      verificationToken,
      verificationTokenExpires,
      billingInfo: {},
      replyToEmail: createAccountDto.email,
      expireDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days trial
      createdBy: new Types.ObjectId('000000000000000000000000'), // System user
      updatedBy: new Types.ObjectId('000000000000000000000000') // System user
    })) as AccountDocument;

    // Get or create ADMIN role
    let adminRole = (await this.rolesService.findByName('ADMIN')) as RoleDocument;
    if (!adminRole) {
      adminRole = (await this.rolesService.create({
        name: 'ADMIN',
        description: 'Administrator with full account access',
        createdBy: new Types.ObjectId('000000000000000000000000'), // System user
        updatedBy: new Types.ObjectId('000000000000000000000000') // System user
      })) as RoleDocument;
    }

    // Create admin user
    const user = (await this.usersService.create(
      account._id,
      createAccountDto.firstName,
      createAccountDto.lastName,
      createAccountDto.email,
      createAccountDto.password,
      [adminRole._id.toString()],
      'active',
      new Types.ObjectId('000000000000000000000000'),
      new Types.ObjectId('000000000000000000000000')
    )) as unknown as UserDocument;

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(createAccountDto.email, `${createAccountDto.firstName} ${createAccountDto.lastName}`, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail the account creation if email fails
    }

    return {
      account: {
        id: account._id,
        name: account.name,
        plan: account.plan,
        status: account.status,
        logoUrl: account.logoUrl
      },
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      message: 'accounts.success.accountCreated'
    };
  }

  @Post('verify-email')
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('accounts.errors.verificationTokenRequired');
    }

    const account = await this.accountsService.findByVerificationToken(token);
    if (!account) {
      throw new BadRequestException('accounts.errors.invalidVerificationToken');
    }

    if (account.status === 'active') {
      throw new BadRequestException('accounts.errors.accountAlreadyVerified');
    }

    if (account.verificationTokenExpires && account.verificationTokenExpires < new Date()) {
      throw new BadRequestException('accounts.errors.verificationTokenExpired');
    }

    // Update account status to active and clear verification token
    await this.accountsService.update(account._id.toString(), {
      status: 'active',
      verificationToken: undefined,
      verificationTokenExpires: undefined
    });

    return {
      message: 'accounts.success.emailVerified',
      account: {
        id: account._id,
        name: account.name,
        status: 'active'
      }
    };
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    if (!body.email) {
      throw new BadRequestException('accounts.errors.emailRequired');
    }

    // Find user by email
    const user = await this.usersService.findOneByEmail(body.email);
    if (!user) {
      throw new NotFoundException('accounts.errors.userNotFound');
    }

    // Check if account is already active
    if (user.account?.status === 'active') {
      throw new BadRequestException('accounts.errors.accountAlreadyVerified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update account with new token
    await this.accountsService.update(user.account._id.toString(), {
      verificationToken,
      verificationTokenExpires
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(user.email, `${user.firstName} ${user.lastName}`, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      throw new BadRequestException('accounts.errors.failedToSendVerificationEmail');
    }

    return {
      message: 'accounts.success.verificationEmailSent'
    };
  }
}
