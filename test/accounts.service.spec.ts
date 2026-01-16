import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountsService } from '../src/accounts/accounts.service';
import { Account, AccountDocument } from '../src/accounts/schemas/account.schema';

describe('AccountsService', () => {
  let service: AccountsService;
  let accountModel: jest.Mocked<Model<AccountDocument>>;

  const mockAccountId = new Types.ObjectId();
  const mockAccount: Account = {
    _id: mockAccountId,
    name: 'test-account',
    plan: 'free',
    status: 'pending',
    billingInfo: {},
    createdBy: 'system',
    updatedBy: 'system',
    logoUrl: 'https://example.com/logo.png',
    verificationToken: 'token123',
    verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  };

  beforeEach(async () => {
    const mockAccountModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    // Mock the constructor behavior
    const MockModel = jest.fn().mockImplementation((data) => {
      const instance = { ...data };
      instance.save = jest.fn().mockResolvedValue({ ...data, _id: mockAccountId });
      return instance;
    });

    // Add static methods to the constructor
    MockModel.find = mockAccountModel.find;
    MockModel.findById = mockAccountModel.findById;
    MockModel.findOne = mockAccountModel.findOne;
    MockModel.findByIdAndUpdate = mockAccountModel.findByIdAndUpdate;
    MockModel.findByIdAndDelete = mockAccountModel.findByIdAndDelete;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getModelToken(Account.name),
          useValue: MockModel,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    accountModel = module.get(getModelToken(Account.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new account', async () => {
      const accountData: Partial<Account> = {
        name: 'test-account',
        plan: 'free',
        status: 'pending',
        billingInfo: {},
        createdBy: 'system',
        updatedBy: 'system',
      };

      const result = await service.create(accountData);

      expect(accountModel).toHaveBeenCalledWith(accountData);
      // The result should be the resolved value from save()
      expect(result).toEqual({
        ...accountData,
        _id: mockAccountId,
      });
    });
  });

  describe('findAll', () => {
    it('should return all accounts', async () => {
      const mockAccounts = [mockAccount];
      accountModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAccounts),
      } as any);

      const result = await service.findAll();

      expect(accountModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('findOne', () => {
    it('should return an account by id', async () => {
      accountModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAccount),
      } as any);

      const result = await service.findOne(mockAccountId);

      expect(accountModel.findById).toHaveBeenCalledWith(mockAccountId);
      expect(result).toEqual(mockAccount);
    });

    it('should return null if account not found', async () => {
      accountModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.findOne(mockAccountId);

      expect(accountModel.findById).toHaveBeenCalledWith(mockAccountId);
      expect(result).toBeNull();
    });
  });

  describe('findByAccountName', () => {
    it('should return an account by name', async () => {
      const accountName = 'test-account';
      accountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAccount),
      } as any);

      const result = await service.findByAccountName(accountName);

      expect(accountModel.findOne).toHaveBeenCalledWith({
        name: { $regex: accountName, $options: 'i' },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should escape special regex characters in account name', async () => {
      const accountName = 'test.account+name';
      const escapedName = 'test\\.account\\+name';
      accountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAccount),
      } as any);

      const result = await service.findByAccountName(accountName);

      expect(accountModel.findOne).toHaveBeenCalledWith({
        name: { $regex: escapedName, $options: 'i' },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should return null if account not found', async () => {
      const accountName = 'non-existent';
      accountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.findByAccountName(accountName);

      expect(accountModel.findOne).toHaveBeenCalledWith({
        name: { $regex: accountName, $options: 'i' },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByVerificationToken', () => {
    it('should return an account by verification token', async () => {
      const token = 'token123';
      accountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAccount),
      } as any);

      const result = await service.findByVerificationToken(token);

      expect(accountModel.findOne).toHaveBeenCalledWith({
        verificationToken: token,
        verificationTokenExpires: { $gt: expect.any(Date) },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should return null if token not found or expired', async () => {
      const token = 'invalid-token';
      accountModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.findByVerificationToken(token);

      expect(accountModel.findOne).toHaveBeenCalledWith({
        verificationToken: token,
        verificationTokenExpires: { $gt: expect.any(Date) },
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an account', async () => {
      const updateData = { status: 'active' as const };
      const updatedAccount = { ...mockAccount, ...updateData };
      accountModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedAccount),
      } as any);

      const result = await service.update(mockAccountId.toString(), updateData);

      expect(accountModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockAccountId.toString(),
        updateData,
        { new: true }
      );
      expect(result).toEqual(updatedAccount);
    });

    it('should return null if account not found', async () => {
      const updateData = { status: 'active' as const };
      accountModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.update(mockAccountId.toString(), updateData);

      expect(accountModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockAccountId.toString(),
        updateData,
        { new: true }
      );
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an account', async () => {
      accountModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAccount),
      } as any);

      const result = await service.delete(mockAccountId);

      expect(accountModel.findByIdAndDelete).toHaveBeenCalledWith(mockAccountId);
      expect(result).toEqual(mockAccount);
    });

    it('should return null if account not found', async () => {
      accountModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.delete(mockAccountId);

      expect(accountModel.findByIdAndDelete).toHaveBeenCalledWith(mockAccountId);
      expect(result).toBeNull();
    });
  });
});