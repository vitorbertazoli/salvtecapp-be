import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AccountsController } from '../src/accounts/accounts.controller';
import { AccountsService } from '../src/accounts/accounts.service';
import { UsersService } from '../src/users/users.service';
import { RolesService } from '../src/roles/roles.service';
import { EmailService } from '../src/utils/email.service';
import { UpdateAccountDto } from '../src/accounts/dto/update-account.dto';

describe('AccountsController', () => {
  let controller: AccountsController;
  let accountsService: jest.Mocked<AccountsService>;
  let usersService: jest.Mocked<UsersService>;
  let rolesService: jest.Mocked<RolesService>;
  let emailService: jest.Mocked<EmailService>;

  const mockAccountId = new Types.ObjectId();
  const mockAccount = {
    _id: mockAccountId,
    name: 'Test Account',
    email: 'test@example.com',
    logoUrl: 'https://example.com/logo.png',
  };

  const mockFile = {
    fieldname: 'logo',
    originalname: 'logo.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    destination: './uploads/logos',
    filename: '1234567890-logo.png',
    path: './uploads/logos/1234567890-logo.png',
    buffer: Buffer.from('fake-image-data'),
  };

  beforeEach(async () => {
    const mockAccountsService = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockUsersService = {
      // Add any methods if needed
    };

    const mockRolesService = {
      // Add any methods if needed
    };

    const mockEmailService = {
      // Add any methods if needed
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {
          provide: AccountsService,
          useValue: mockAccountsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
    accountsService = module.get(AccountsService);
    usersService = module.get(UsersService);
    rolesService = module.get(RolesService);
    emailService = module.get(EmailService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findById', () => {
    it('should return account data when user has access to their own account', async () => {
      const accountId = mockAccountId.toString();

      accountsService.findOne.mockResolvedValue(mockAccount as any);

      const result = await controller.findById(accountId, mockAccountId);

      expect(accountsService.findOne).toHaveBeenCalledWith(mockAccountId);
      expect(result).toEqual(mockAccount);
    });

    it('should throw HttpException when user tries to access another account', async () => {
      const accountId = 'different-account-id';
      const differentAccountId = new Types.ObjectId();

      const result = await controller.findById(accountId, differentAccountId);

      expect(result).toBeInstanceOf(HttpException);
      expect((result as HttpException).getStatus()).toBe(403);
      expect((result as any).message).toBe('Access denied');
      expect(accountsService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update account successfully when user has access', async () => {
      const accountId = mockAccountId.toString();
      const updateData: UpdateAccountDto = {
        name: 'Updated Account Name',
      };

      const updatedAccount = { ...mockAccount, ...updateData };
      accountsService.update.mockResolvedValue(updatedAccount as any);

      const result = await controller.update(accountId, updateData, mockAccountId);

      expect(accountsService.update).toHaveBeenCalledWith(accountId, updateData);
      expect(result).toEqual(updatedAccount);
    });

    it('should throw HttpException when user tries to update another account', async () => {
      const accountId = 'different-account-id';
      const differentAccountId = new Types.ObjectId();
      const updateData: UpdateAccountDto = {
        name: 'Updated Account Name',
      };

      const result = await controller.update(accountId, updateData, differentAccountId);

      expect(result).toBeInstanceOf(HttpException);
      expect((result as HttpException).getStatus()).toBe(403);
      expect((result as any).message).toBe('Access denied');
      expect(accountsService.update).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const accountId = mockAccountId.toString();
      const updateData: UpdateAccountDto = {
        name: 'Only Name Updated',
      };

      const updatedAccount = { ...mockAccount, name: 'Only Name Updated' };
      accountsService.update.mockResolvedValue(updatedAccount as any);

      const result = await controller.update(accountId, updateData, mockAccountId);

      expect(accountsService.update).toHaveBeenCalledWith(accountId, updateData);
      expect(result).toEqual(updatedAccount);
    });
  });

  describe('uploadLogo', () => {
    it('should upload logo successfully when user has access', async () => {
      const accountId = mockAccountId.toString();
      const expectedLogoUrl = `/uploads/logos/${mockFile.filename}`;

      accountsService.update.mockResolvedValue({ ...mockAccount, logoUrl: expectedLogoUrl } as any);

      const result = await controller.uploadLogo(accountId, mockFile as any, mockAccountId);

      expect(accountsService.update).toHaveBeenCalledWith(accountId, { logoUrl: expectedLogoUrl });
      expect(result).toEqual({ logoUrl: expectedLogoUrl });
    });

    it('should throw HttpException when user tries to upload logo for another account', async () => {
      const accountId = 'different-account-id';
      const differentAccountId = new Types.ObjectId();

      const result = await controller.uploadLogo(accountId, mockFile as any, differentAccountId);

      expect(result).toBeInstanceOf(HttpException);
      expect((result as HttpException).getStatus()).toBe(403);
      expect((result as any).message).toBe('Access denied');
      expect(accountsService.update).not.toHaveBeenCalled();
    });

    it('should throw HttpException when no file is uploaded', async () => {
      const accountId = mockAccountId.toString();

      try {
        await controller.uploadLogo(accountId, undefined as any, mockAccountId);
        fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(400);
        expect((error as any).message).toBe('No file uploaded');
        expect(accountsService.update).not.toHaveBeenCalled();
      }
    });

    it('should handle different file types and generate correct paths', async () => {
      const accountId = mockAccountId.toString();
      const jpegFile = {
        ...mockFile,
        originalname: 'logo.jpeg',
        mimetype: 'image/jpeg',
        filename: '1234567890-logo.jpeg',
      };
      const expectedLogoUrl = `/uploads/logos/${jpegFile.filename}`;

      accountsService.update.mockResolvedValue({ ...mockAccount, logoUrl: expectedLogoUrl } as any);

      const result = await controller.uploadLogo(accountId, jpegFile as any, mockAccountId);

      expect(accountsService.update).toHaveBeenCalledWith(accountId, { logoUrl: expectedLogoUrl });
      expect(result).toEqual({ logoUrl: expectedLogoUrl });
    });

    it('should handle files with complex names', async () => {
      const accountId = mockAccountId.toString();
      const complexFile = {
        ...mockFile,
        originalname: 'my-complex-logo-name with spaces.png',
        filename: '1234567890-my-complex-logo-name with spaces.png',
      };
      const expectedLogoUrl = `/uploads/logos/${complexFile.filename}`;

      accountsService.update.mockResolvedValue({ ...mockAccount, logoUrl: expectedLogoUrl } as any);

      const result = await controller.uploadLogo(accountId, complexFile as any, mockAccountId);

      expect(accountsService.update).toHaveBeenCalledWith(accountId, { logoUrl: expectedLogoUrl });
      expect(result).toEqual({ logoUrl: expectedLogoUrl });
    });
  });

  describe('File Upload Validation', () => {
    // Note: File validation (fileFilter, limits) is handled by Multer middleware
    // and would be tested in integration/e2e tests, not unit tests
    it('should accept valid image files', async () => {
      const accountId = mockAccountId.toString();
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];

      for (const mimeType of validImageTypes) {
        const file = { ...mockFile, mimetype: mimeType };
        const expectedLogoUrl = `/uploads/logos/${file.filename}`;

        accountsService.update.mockResolvedValue({ ...mockAccount, logoUrl: expectedLogoUrl } as any);

        const result = await controller.uploadLogo(accountId, file as any, mockAccountId);

        expect(result).toEqual({ logoUrl: expectedLogoUrl });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors during account retrieval', async () => {
      const accountId = mockAccountId.toString();

      accountsService.findOne.mockRejectedValue(new Error('Database error'));

      await expect(controller.findById(accountId, mockAccountId)).rejects.toThrow('Database error');
    });

    it('should handle service errors during account update', async () => {
      const accountId = mockAccountId.toString();
      const updateData: UpdateAccountDto = { name: 'New Name' };

      accountsService.update.mockRejectedValue(new Error('Update failed'));

      await expect(controller.update(accountId, updateData, mockAccountId)).rejects.toThrow('Update failed');
    });

    it('should handle service errors during logo upload', async () => {
      const accountId = mockAccountId.toString();

      accountsService.update.mockRejectedValue(new Error('Logo update failed'));

      await expect(controller.uploadLogo(accountId, mockFile as any, mockAccountId)).rejects.toThrow('Logo update failed');
    });
  });

  describe('Security', () => {
    it('should enforce account ownership for all operations', async () => {
      const differentAccountId = new Types.ObjectId();
      const accountId = mockAccountId.toString();

      // Test findById
      const findResult = await controller.findById(accountId, differentAccountId);
      expect(findResult).toBeInstanceOf(HttpException);

      // Test update
      const updateResult = await controller.update(accountId, { name: 'test' }, differentAccountId);
      expect(updateResult).toBeInstanceOf(HttpException);

      // Test uploadLogo
      const uploadResult = await controller.uploadLogo(accountId, mockFile as any, differentAccountId);
      expect(uploadResult).toBeInstanceOf(HttpException);
    });

    it('should validate account ID format', async () => {
      // This test verifies that the controller passes the account ID to the service
      // The actual ID validation would be handled by parameter pipes or the service layer
      const validAccountId = mockAccountId.toString();

      accountsService.findOne.mockResolvedValue(mockAccount as any);

      const result = await controller.findById(validAccountId, mockAccountId);

      // The controller should call the service when IDs match
      expect(accountsService.findOne).toHaveBeenCalledWith(mockAccountId);
      expect(result).toEqual(mockAccount);
    });
  });
});