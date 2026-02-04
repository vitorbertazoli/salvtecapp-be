jest.mock('marked', () => ({
  marked: jest.fn((input) => `<p>${input}</p>`)
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AdminController } from '../src/admin/admin.controller';
import { AdminService } from '../src/admin/admin.service';
import { UpdateAccountStatusDto } from '../src/admin/dto/update-account-status.dto';
import { MasterAdminGuard } from '../src/admin/guards/master-admin.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;

  const mockAccountId = new Types.ObjectId();
  const mockCurrentUserAccountId = new Types.ObjectId();

  const mockAccountsResponse = {
    accounts: [
      {
        id: '507f1f77bcf86cd799439011',
        name: 'test-account',
        plan: 'free',
        status: 'active',
        logoUrl: 'https://example.com/logo.png',
        createdAt: new Date(),
        expireDate: new Date()
      }
    ],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1
  };

  const mockUpdatedAccount = {
    id: '507f1f77bcf86cd799439011',
    name: 'test-account',
    plan: 'free',
    status: 'active',
    logoUrl: 'https://example.com/logo.png'
  };

  const mockDeletedAccount = {
    id: '507f1f77bcf86cd799439011',
    name: 'test-account',
    message: 'Account and all related data deleted successfully'
  };

  beforeEach(async () => {
    const mockAdminService = {
      getAllAccounts: jest.fn(),
      updateAccountStatus: jest.fn(),
      deleteAccount: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(MasterAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated accounts with default parameters', async () => {
      adminService.getAllAccounts.mockResolvedValue(mockAccountsResponse);

      const result = await controller.findAll();

      expect(adminService.getAllAccounts).toHaveBeenCalledWith(1, 10, '');
      expect(result).toEqual(mockAccountsResponse);
    });

    it('should return paginated accounts with custom parameters', async () => {
      adminService.getAllAccounts.mockResolvedValue(mockAccountsResponse);

      const result = await controller.findAll('2', '20', 'test');

      expect(adminService.getAllAccounts).toHaveBeenCalledWith(2, 20, 'test');
      expect(result).toEqual(mockAccountsResponse);
    });

    it('should handle invalid page parameter', async () => {
      adminService.getAllAccounts.mockResolvedValue(mockAccountsResponse);

      const result = await controller.findAll('invalid', '10', '');

      expect(adminService.getAllAccounts).toHaveBeenCalledWith(1, 10, '');
      expect(result).toEqual(mockAccountsResponse);
    });

    it('should handle invalid limit parameter', async () => {
      adminService.getAllAccounts.mockResolvedValue(mockAccountsResponse);

      const result = await controller.findAll('1', 'invalid', '');

      expect(adminService.getAllAccounts).toHaveBeenCalledWith(1, 10, '');
      expect(result).toEqual(mockAccountsResponse);
    });
  });

  describe('updateAccountStatus', () => {
    it('should update account status successfully', async () => {
      const updateDto: UpdateAccountStatusDto = { status: 'active' };
      adminService.updateAccountStatus.mockResolvedValue(mockUpdatedAccount);

      const result = await controller.updateAccountStatus('507f1f77bcf86cd799439011', updateDto);

      expect(adminService.updateAccountStatus).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'active');
      expect(result).toEqual(mockUpdatedAccount);
    });

    it('should handle different status values', async () => {
      const updateDto: UpdateAccountStatusDto = { status: 'suspended' };
      const suspendedAccount = { ...mockUpdatedAccount, status: 'suspended' as const };
      adminService.updateAccountStatus.mockResolvedValue(suspendedAccount);

      const result = await controller.updateAccountStatus('507f1f77bcf86cd799439011', updateDto);

      expect(adminService.updateAccountStatus).toHaveBeenCalledWith('507f1f77bcf86cd799439011', 'suspended');
      expect(result).toEqual(suspendedAccount);
    });
  });

  describe('deleteAccount', () => {
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        user: {
          account: mockCurrentUserAccountId.toString()
        }
      };
    });

    it('should delete account successfully when not deleting own account', async () => {
      adminService.deleteAccount.mockResolvedValue(mockDeletedAccount);

      // Mock the GetAccountId decorator by setting up the request
      const result = await controller.deleteAccount(mockAccountId, mockCurrentUserAccountId.toString());

      expect(adminService.deleteAccount).toHaveBeenCalledWith(mockAccountId);
      expect(result).toEqual(mockDeletedAccount);
    });

    it('should throw error when trying to delete own account', async () => {
      const ownAccountId = mockCurrentUserAccountId;

      await expect(controller.deleteAccount(ownAccountId, ownAccountId.toString())).rejects.toThrow('admin.errors.cannotDeleteOwnAccount');

      expect(adminService.deleteAccount).not.toHaveBeenCalled();
    });

    it('should allow deletion when account IDs are different', async () => {
      adminService.deleteAccount.mockResolvedValue(mockDeletedAccount);

      const result = await controller.deleteAccount(mockAccountId, mockCurrentUserAccountId.toString());

      expect(adminService.deleteAccount).toHaveBeenCalledWith(mockAccountId);
      expect(result).toEqual(mockDeletedAccount);
    });
  });
});
