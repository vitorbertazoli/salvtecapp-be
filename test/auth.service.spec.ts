import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AccountsService } from '../src/accounts/accounts.service';
import { AuthService } from '../src/auth/auth.service';
import { TechniciansService } from '../src/technicians/technicians.service';
import { UsersService } from '../src/users/users.service';
import { EmailService } from '../src/utils/email.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn()
}));

// Mock EmailService
jest.mock('../src/utils/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendPasswordResetEmail: jest.fn()
  }))
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let accountsService: jest.Mocked<AccountsService>;
  let techniciansService: jest.Mocked<TechniciansService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUserId = '507f1f77bcf86cd799439011';
  const mockAccountId = '507f1f77bcf86cd799439012';
  const mockTechnicianId = '507f1f77bcf86cd799439013';

  const mockUser = {
    id: mockUserId.toString(),
    _id: mockUserId,
    account: {
      id: mockAccountId.toString(),
      name: 'Test Account',
      logoUrl: 'https://example.com/logo.png',
      status: 'active'
    },
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    passwordHash: 'hashedpassword',
    status: 'active',
    roles: [{ name: 'ADMIN' }, { name: 'TECHNICIAN' }],
    isMasterAdmin: false,
    toObject: jest.fn().mockReturnValue({
      id: mockUserId.toString(),
      account: {
        id: mockAccountId.toString(),
        name: 'Test Account',
        logoUrl: 'https://example.com/logo.png',
        status: 'active'
      },
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      status: 'active',
      roles: [{ name: 'ADMIN' }, { name: 'TECHNICIAN' }],
      isMasterAdmin: false
    })
  };

  const mockTechnician = {
    id: mockTechnicianId.toString(),
    _id: mockTechnicianId,
    userId: mockUserId.toString()
  };

  const mockTokens = {
    access_token: 'access_token_123',
    refresh_token: 'refresh_token_123'
  };

  beforeEach(async () => {
    const mockUsersService = {
      findOneByEmail: jest.fn(),
      findById: jest.fn(),
      updateResetToken: jest.fn(),
      findByResetToken: jest.fn(),
      update: jest.fn()
    };

    const mockJwtService = {
      sign: jest.fn()
    };

    const mockAccountsService = {
      // Add any methods if needed
    };

    const mockTechniciansService = {
      findByUserId: jest.fn()
    };

    const mockEmailService = {
      sendPasswordResetEmail: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        },
        {
          provide: AccountsService,
          useValue: mockAccountsService
        },
        {
          provide: TechniciansService,
          useValue: mockTechniciansService
        },
        {
          provide: EmailService,
          useValue: mockEmailService
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    accountsService = module.get(AccountsService);
    techniciansService = module.get(TechniciansService);
    emailService = module.get(EmailService);

    // Setup default mocks
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    (crypto.randomBytes as jest.Mock).mockReturnValue({
      toString: jest.fn().mockReturnValue('reset_token_123')
    } as any);
    jwtService.sign.mockReturnValueOnce('access_token_123').mockReturnValueOnce('refresh_token_123');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data without password when credentials are valid', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('john.doe@example.com', 'password123');

      expect(usersService.findOneByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(result).toEqual({
        id: mockUserId.toString(),
        account: mockUser.account,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        status: 'active',
        roles: mockUser.roles,
        isMasterAdmin: false
      });
    });

    it('should return null when user not found', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('john.doe@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should throw error when account is pending', async () => {
      const pendingAccountUser = {
        ...mockUser,
        account: { ...mockUser.account, status: 'pending' }
      };
      usersService.findOneByEmail.mockResolvedValue(pendingAccountUser);

      await expect(service.validateUser('john.doe@example.com', 'password123')).rejects.toThrow('auth.errors.accountNotVerified');
    });

    it('should throw error when account is suspended', async () => {
      const suspendedAccountUser = {
        ...mockUser,
        account: { ...mockUser.account, status: 'suspended' }
      };
      usersService.findOneByEmail.mockResolvedValue(suspendedAccountUser);

      await expect(service.validateUser('john.doe@example.com', 'password123')).rejects.toThrow('auth.errors.accountSuspended');
    });

    it('should throw error when user is inactive', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };
      usersService.findOneByEmail.mockResolvedValue(inactiveUser);

      await expect(service.validateUser('john.doe@example.com', 'password123')).rejects.toThrow('auth.errors.userNotActive');
    });
  });

  describe('login', () => {
    it('should return tokens and user data on successful login', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser);
      techniciansService.findByUserId.mockResolvedValue(mockTechnician);

      const result = await service.login(mockUser);

      expect(usersService.findOneByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(techniciansService.findByUserId).toHaveBeenCalledWith(mockUserId.toString());
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        user: {
          sub: mockUserId.toString(),
          id: mockUserId.toString(),
          account: mockAccountId.toString(),
          accountName: 'Test Account',
          logoUrl: 'https://example.com/logo.png',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          roles: ['ADMIN', 'TECHNICIAN'],
          technicianId: mockTechnicianId.toString()
        }
      });
    });

    it('should return null when user not found', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      const result = await service.login(mockUser);

      expect(result).toBeNull();
    });

    it('should handle master admin user', async () => {
      const masterAdminUser = { ...mockUser, isMasterAdmin: true };
      usersService.findOneByEmail.mockResolvedValue(masterAdminUser);
      techniciansService.findByUserId.mockResolvedValue(null);

      const result = await service.login(masterAdminUser);

      expect(result.user.isMasterAdmin).toBe(true);
    });

    it('should handle user without technician role', async () => {
      const nonTechnicianUser = {
        ...mockUser,
        roles: [{ name: 'ADMIN' }]
      };
      usersService.findOneByEmail.mockResolvedValue(nonTechnicianUser);

      const result = await service.login(nonTechnicianUser);

      expect(result.user.technicianId).toBeUndefined();
      expect(result.user.roles).toEqual(['ADMIN']);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens on successful refresh', async () => {
      const userFromGuard = { id: mockUserId.toString() };
      usersService.findById.mockResolvedValue(mockUser);
      techniciansService.findByUserId.mockResolvedValue(mockTechnician);

      const result = await service.refreshToken(userFromGuard);

      expect(usersService.findById).toHaveBeenCalledWith(mockUserId.toString());
      expect(result).toEqual({
        access_token: 'access_token_123',
        refresh_token: 'refresh_token_123',
        user: expect.objectContaining({
          id: mockUserId.toString(),
          email: 'john.doe@example.com',
          technicianId: mockTechnicianId.toString()
        })
      });
    });

    it('should throw error when user not found', async () => {
      const userFromGuard = { id: mockUserId.toString() };
      usersService.findById.mockResolvedValue(null);

      await expect(service.refreshToken(userFromGuard)).rejects.toThrow('auth.errors.userNotFound');
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email when user exists', async () => {
      usersService.findOneByEmail.mockResolvedValue(mockUser);
      usersService.updateResetToken.mockResolvedValue(undefined);
      emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword('john.doe@example.com');

      expect(usersService.findOneByEmail).toHaveBeenCalledWith('john.doe@example.com');
      expect(usersService.updateResetToken).toHaveBeenCalledWith('john.doe@example.com', 'reset_token_123', expect.any(Date));
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith('john.doe@example.com', 'reset_token_123', 'John Doe');
      expect(result).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    });

    it('should return success message even when user does not exist', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(usersService.updateResetToken).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result).toEqual({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      usersService.findByResetToken.mockResolvedValue(mockUser);
      usersService.update.mockResolvedValue(undefined);

      const result = await service.resetPassword('valid_token', 'newpassword123');

      expect(usersService.findByResetToken).toHaveBeenCalledWith('valid_token');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        {
          passwordHash: 'hashed_password',
          resetToken: undefined,
          resetTokenExpiry: undefined
        },
        mockUser.account
      );
      expect(result).toEqual({ message: 'Password has been reset successfully' });
    });

    it('should throw error with invalid token', async () => {
      usersService.findByResetToken.mockResolvedValue(null);

      await expect(service.resetPassword('invalid_token', 'newpassword123')).rejects.toThrow('auth.errors.invalidResetToken');
    });
  });
});
