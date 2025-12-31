import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { EmailService } from '../utils/email.service';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { AccountDocument } from './schemas/account.schema';
import { RoleDocument } from '../roles/schemas/role.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  async create(
    @Body()
    createAccountDto: {
      name: string;
      plan: 'free' | 'pro' | 'enterprise';
      logoUrl?: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }
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
      logoUrl: createAccountDto.logoUrl,
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
