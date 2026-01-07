import { Body, Controller, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as crypto from 'crypto';
import type * as Express from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RolesService } from '../roles/roles.service';
import { RoleDocument } from '../roles/schemas/role.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { EmailService } from '../utils/email.service';
import { AccountsService } from './accounts.service';
import { AccountDocument } from './schemas/account.schema';

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly emailService: EmailService
  ) {}

  @Post()
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
          return callback(new Error('Only image files are allowed!'), false);
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
    createAccountDto: {
      name: string;
      plan: 'free' | 'pro' | 'enterprise';
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    },
    @UploadedFile() logo?: Express.Multer.File
  ) {
    // Convert account name to lowercase and replace spaces/special chars with dashes
    const accountName = createAccountDto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if account already exists
    const existingAccount = await this.accountsService.findByAccountName(accountName);
    if (existingAccount) {
      throw new Error('Account with this name already exists');
    }

    // Check if user email already exists
    const existingUser = await this.usersService.findOneByEmail(createAccountDto.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
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
      createdBy: 'system',
      updatedBy: 'system'
    })) as AccountDocument;

    // Get or create ADMIN role
    let adminRole = (await this.rolesService.findByName('ADMIN')) as RoleDocument;
    if (!adminRole) {
      adminRole = (await this.rolesService.create({
        name: 'ADMIN',
        description: 'Administrator with full account access',
        createdBy: 'system',
        updatedBy: 'system'
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
      'system',
      'system'
    )) as UserDocument;

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
      message: 'Account created successfully. Please check your email to verify your account.'
    };
  }

  @Post('verify-email')
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new Error('Verification token is required');
    }

    const account = await this.accountsService.findByVerificationToken(token);
    if (!account) {
      throw new Error('Invalid or expired verification token');
    }

    if (account.status === 'active') {
      throw new Error('Account is already verified');
    }

    if (account.verificationTokenExpires && account.verificationTokenExpires < new Date()) {
      throw new Error('Verification token has expired');
    }

    // Update account status to active and clear verification token
    await this.accountsService.update(account._id.toString(), {
      status: 'active',
      verificationToken: undefined,
      verificationTokenExpires: undefined
    });

    return {
      message: 'Email verified successfully. Your account is now active.',
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
      throw new Error('Email is required');
    }

    // Find user by email
    const user = await this.usersService.findOneByEmail(body.email);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if account is already active
    if (user.account?.status === 'active') {
      throw new Error('Account is already verified');
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
      throw new Error('Failed to send verification email');
    }

    return {
      message: 'Verification email sent successfully. Please check your email.'
    };
  }
}
