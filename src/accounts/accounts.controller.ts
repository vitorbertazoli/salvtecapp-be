import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EmailService } from '../utils/email.service';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { AccountDocument } from './schemas/account.schema';
import { RoleDocument } from '../roles/schemas/role.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly emailService: EmailService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('logo', {
    storage: diskStorage({
      destination: './uploads/logos',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        callback(null, uniqueSuffix + extname(file.originalname));
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
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

    // Create account
    const account = (await this.accountsService.create({
      name: accountName,
      plan: createAccountDto.plan,
      logoUrl: logo ? `/uploads/logos/${logo.filename}` : undefined,
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
      account._id.toString(),
      createAccountDto.firstName,
      createAccountDto.lastName,
      createAccountDto.email,
      createAccountDto.password,
      [adminRole._id.toString()],
      'system',
      'system'
    )) as UserDocument;

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(createAccountDto.email, `${createAccountDto.firstName} ${createAccountDto.lastName}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the account creation if email fails
    }

    return {
      account: {
        id: account._id,
        name: account.name,
        plan: account.plan,
        logoUrl: account.logoUrl
      },
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    };
  }
}
