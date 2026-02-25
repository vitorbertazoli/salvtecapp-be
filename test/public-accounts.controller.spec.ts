import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Types } from 'mongoose';
import { AccountsService } from '../src/accounts/accounts.service';
import { CreateAccountDto } from '../src/accounts/dto/create-account.dto';
import { PublicAccountsController } from '../src/accounts/public-accounts.controller';
import { AccountDocument } from '../src/accounts/schemas/account.schema';
import { RolesService } from '../src/roles/roles.service';
import { RoleDocument } from '../src/roles/schemas/role.schema';
import { UserDocument } from '../src/users/schemas/user.schema';
import { UsersService } from '../src/users/users.service';
import { EmailService } from '../src/utils/email.service';

describe('PublicAccountsController', () => {
  let controller: PublicAccountsController;
  let accountsService: jest.Mocked<AccountsService>;
  let usersService: jest.Mocked<UsersService>;
  let rolesService: jest.Mocked<RolesService>;
  let emailService: jest.Mocked<EmailService>;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockRoleId = new Types.ObjectId();

  const mockAccount: AccountDocument = {
    _id: mockAccountId,
    name: 'Test Account',
    plan: 'free',
    status: 'pending',
    billingInfo: {},
    createdBy: mockUserId,
    updatedBy: mockUserId,
    logoUrl: '/uploads/logos/test-logo.png',
    verificationToken: 'token123',
    verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
  } as AccountDocument;

  const mockUser: UserDocument = {
    _id: mockUserId,
    account: mockAccountId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    passwordHash: 'hashedpassword',
    status: 'active',
    roles: [mockRoleId],
    isMasterAdmin: false,
    createdBy: mockUserId,
    updatedBy: mockUserId
  } as UserDocument;

  const mockRole: RoleDocument = {
    _id: mockRoleId,
    name: 'ADMIN',
    description: 'Administrator with full account access',
    createdBy: mockUserId,
    updatedBy: mockUserId
  } as RoleDocument;

  const mockFile = {
    fieldname: 'logo',
    originalname: 'logo.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    destination: './uploads/logos',
    filename: '1234567890-logo.png',
    path: './uploads/logos/1234567890-logo.png',
    buffer: Buffer.from('fake-image-data')
  };

  beforeEach(async () => {
    const mockAccountsService = {
      create: jest.fn(),
      findByAccountName: jest.fn(),
      findByVerificationToken: jest.fn(),
      update: jest.fn()
    };

    const mockUsersService = {
      create: jest.fn(),
      findOneByEmail: jest.fn()
    };

    const mockRolesService = {
      findByName: jest.fn(),
      create: jest.fn()
    };

    const mockEmailService = {
      sendVerificationEmail: jest.fn(),
      sendEmail: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicAccountsController],
      providers: [
        {
          provide: AccountsService,
          useValue: mockAccountsService
        },
        {
          provide: UsersService,
          useValue: mockUsersService
        },
        {
          provide: RolesService,
          useValue: mockRolesService
        },
        {
          provide: EmailService,
          useValue: mockEmailService
        }
      ]
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PublicAccountsController>(PublicAccountsController);
    accountsService = module.get(AccountsService);
    usersService = module.get(UsersService);
    rolesService = module.get(RolesService);
    emailService = module.get(EmailService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createAccountDto: CreateAccountDto = {
      name: 'Test Account',
      plan: 'free',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123'
    };

    it('should create a new account successfully', async () => {
      accountsService.findByAccountName.mockResolvedValue(null);
      usersService.findOneByEmail.mockResolvedValue(null);
      accountsService.create.mockResolvedValue(mockAccount);
      rolesService.findByName.mockResolvedValue(mockRole);
      usersService.create.mockResolvedValue(mockUser);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await controller.create(createAccountDto, mockFile);

      expect(accountsService.findByAccountName).toHaveBeenCalledWith('Test Account');
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(createAccountDto.email);
      expect(accountsService.create).toHaveBeenCalledWith({
        name: 'Test Account',
        plan: createAccountDto.plan,
        logoUrl: `/uploads/logos/${mockFile.filename}`,
        status: 'pending',
        verificationToken: expect.any(String),
        verificationTokenExpires: expect.any(Date),
        billingInfo: {},
        replyToEmail: createAccountDto.email,
        expireDate: expect.any(Date),
        createdBy: new Types.ObjectId('000000000000000000000000'),
        updatedBy: new Types.ObjectId('000000000000000000000000')
      });
      expect(rolesService.findByName).toHaveBeenCalledWith('ADMIN');
      expect(usersService.create).toHaveBeenCalledWith(
        mockAccount._id,
        createAccountDto.firstName,
        createAccountDto.lastName,
        createAccountDto.email,
        createAccountDto.password,
        [mockRole._id.toString()],
        'active',
        new Types.ObjectId('000000000000000000000000'),
        new Types.ObjectId('000000000000000000000000')
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        createAccountDto.email,
        `${createAccountDto.firstName} ${createAccountDto.lastName}`,
        expect.any(String)
      );
      expect(result).toEqual({
        account: {
          id: mockAccount._id,
          name: mockAccount.name,
          plan: mockAccount.plan,
          status: mockAccount.status,
          logoUrl: mockAccount.logoUrl
        },
        user: {
          id: mockUser._id,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          email: mockUser.email
        },
        message: 'account.success.accountCreated'
      });
    });

    it('should create account without logo', async () => {
      accountsService.findByAccountName.mockResolvedValue(null);
      usersService.findOneByEmail.mockResolvedValue(null);
      accountsService.create.mockResolvedValue({ ...mockAccount, logoUrl: undefined });
      rolesService.findByName.mockResolvedValue(mockRole);
      usersService.create.mockResolvedValue(mockUser);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await controller.create(createAccountDto);

      expect(accountsService.create).toHaveBeenCalledWith({
        name: 'Test Account',
        plan: createAccountDto.plan,
        logoUrl: undefined,
        status: 'pending',
        verificationToken: expect.any(String),
        verificationTokenExpires: expect.any(Date),
        billingInfo: {},
        replyToEmail: createAccountDto.email,
        expireDate: expect.any(Date),
        createdBy: new Types.ObjectId('000000000000000000000000'),
        updatedBy: new Types.ObjectId('000000000000000000000000')
      });
      expect(result.account.logoUrl).toBeUndefined();
    });

    it('should create ADMIN role if it does not exist', async () => {
      accountsService.findByAccountName.mockResolvedValue(null);
      usersService.findOneByEmail.mockResolvedValue(null);
      accountsService.create.mockResolvedValue(mockAccount);
      rolesService.findByName.mockResolvedValue(null);
      rolesService.create.mockResolvedValue(mockRole);
      usersService.create.mockResolvedValue(mockUser);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);

      await controller.create(createAccountDto, mockFile);

      expect(rolesService.findByName).toHaveBeenCalledWith('ADMIN');
      expect(rolesService.create).toHaveBeenCalledWith({
        name: 'ADMIN',
        description: 'Administrator with full account access',
        createdBy: new Types.ObjectId('000000000000000000000000'),
        updatedBy: new Types.ObjectId('000000000000000000000000')
      });
    });

    it('should handle email service failure gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      accountsService.findByAccountName.mockResolvedValue(null);
      usersService.findOneByEmail.mockResolvedValue(null);
      accountsService.create.mockResolvedValue(mockAccount);
      rolesService.findByName.mockResolvedValue(mockRole);
      usersService.create.mockResolvedValue(mockUser);
      emailService.sendVerificationEmail.mockRejectedValue(new Error('Email service error'));

      const result = await controller.create(createAccountDto, mockFile);

      expect(result).toBeDefined();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send verification email:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should throw error if user email already exists', async () => {
      accountsService.findByAccountName.mockResolvedValue(null);
      usersService.findOneByEmail.mockResolvedValue(mockUser);

      await expect(controller.create(createAccountDto)).rejects.toThrow('account.errors.userEmailExists');

      expect(accountsService.findByAccountName).toHaveBeenCalledWith('Test Account');
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(createAccountDto.email);
      expect(accountsService.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'valid-token';
      accountsService.findByVerificationToken.mockResolvedValue(mockAccount);
      accountsService.update.mockResolvedValue({ ...mockAccount, status: 'active', verificationToken: undefined, verificationTokenExpires: undefined });

      const result = await controller.verifyEmail(token);

      expect(accountsService.findByVerificationToken).toHaveBeenCalledWith(token);
      expect(accountsService.update).toHaveBeenCalledWith(mockAccount._id.toString(), {
        status: 'active',
        verificationToken: undefined,
        verificationTokenExpires: undefined
      });
      expect(result).toEqual({
        message: 'account.success.emailVerified',
        account: {
          id: mockAccount._id,
          name: mockAccount.name,
          status: 'active'
        }
      });
    });

    it('should throw error if token is missing', async () => {
      await expect(controller.verifyEmail('')).rejects.toThrow('account.errors.verificationTokenRequired');
      expect(accountsService.findByVerificationToken).not.toHaveBeenCalled();
    });

    it('should throw error if token is invalid', async () => {
      const token = 'invalid-token';
      accountsService.findByVerificationToken.mockResolvedValue(null);

      await expect(controller.verifyEmail(token)).rejects.toThrow('account.errors.invalidVerificationToken');
    });

    it('should throw BadRequestException if account is already active', async () => {
      const token = 'valid-token';
      const activeAccount = { ...mockAccount, status: 'active' };
      accountsService.findByVerificationToken.mockResolvedValue(activeAccount);

      await expect(controller.verifyEmail(token)).rejects.toThrow(BadRequestException);
      expect(accountsService.update).not.toHaveBeenCalled();
    });

    it('should throw error if token is expired', async () => {
      const token = 'expired-token';
      const expiredAccount = {
        ...mockAccount,
        verificationTokenExpires: new Date(Date.now() - 1000)
      };
      accountsService.findByVerificationToken.mockResolvedValue(expiredAccount);

      await expect(controller.verifyEmail(token)).rejects.toThrow('account.errors.verificationTokenExpired');
      expect(accountsService.update).not.toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    const resendBody = { email: 'john.doe@example.com' };

    it('should resend verification email successfully', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser);
      accountsService.update.mockResolvedValue(mockAccount);
      emailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await controller.resendVerification(resendBody);

      expect(usersService.findOneByEmail).toHaveBeenCalledWith(resendBody.email);
      expect(accountsService.update).toHaveBeenCalledWith(mockUser.account.toString(), {
        verificationToken: expect.any(String),
        verificationTokenExpires: expect.any(Date)
      });
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(mockUser.email, `${mockUser.firstName} ${mockUser.lastName}`, expect.any(String));
      expect(result).toEqual({
        message: 'account.success.verificationEmailSent'
      });
    });

    it('should throw error if email is missing', async () => {
      await expect(controller.resendVerification({ email: '' })).rejects.toThrow('account.errors.emailRequired');
      expect(usersService.findOneByEmail).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      await expect(controller.resendVerification(resendBody)).rejects.toThrow('account.errors.userNotFound');
    });

    it('should throw error if account is already active', async () => {
      const activeUser = { ...mockUser, account: { ...mockAccount, status: 'active' } };
      usersService.findOneByEmail.mockResolvedValue(activeUser);

      await expect(controller.resendVerification(resendBody)).rejects.toThrow('account.errors.accountAlreadyVerified');
      expect(accountsService.update).not.toHaveBeenCalled();
    });

    it('should throw error if email service fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      usersService.findOneByEmail.mockResolvedValue(mockUser);
      accountsService.update.mockResolvedValue(mockAccount);
      emailService.sendVerificationEmail.mockRejectedValue(new Error('Email service error'));

      await expect(controller.resendVerification(resendBody)).rejects.toThrow('account.errors.failedToSendVerificationEmail');

      consoleErrorSpy.mockRestore();
    });
  });
});
