import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AdminService } from '../src/admin/admin.service';
import { AccountsService } from '../src/accounts/accounts.service';
import { CustomersService } from '../src/customers/customers.service';
import { UsersService } from '../src/users/users.service';
import { ProductsService } from '../src/products/products.service';
import { QuotesService } from '../src/quotes/quotes.service';
import { ServiceOrdersService } from '../src/service-orders/service-orders.service';
import { ServicesService } from '../src/services/services.service';
import { TechniciansService } from '../src/technicians/technicians.service';
import { EventsService } from '../src/events/events.service';
import { FollowUpsService } from '../src/follow-ups/follow-ups.service';
import { AccountDocument } from '../src/accounts/schemas/account.schema';

describe('AdminService', () => {
  let service: AdminService;
  let accountsService: jest.Mocked<AccountsService>;
  let customersService: jest.Mocked<CustomersService>;
  let usersService: jest.Mocked<UsersService>;
  let productsService: jest.Mocked<ProductsService>;
  let quotesService: jest.Mocked<QuotesService>;
  let serviceOrdersService: jest.Mocked<ServiceOrdersService>;
  let servicesService: jest.Mocked<ServicesService>;
  let techniciansService: jest.Mocked<TechniciansService>;
  let eventsService: jest.Mocked<EventsService>;
  let followUpsService: jest.Mocked<FollowUpsService>;

  const mockAccountId = new Types.ObjectId();
  const mockAccount: AccountDocument = {
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
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  } as AccountDocument;

  const mockAccount2: AccountDocument = {
    _id: new Types.ObjectId(),
    name: 'another-account',
    plan: 'pro',
    status: 'active',
    billingInfo: {},
    createdBy: 'system',
    updatedBy: 'system',
    logoUrl: 'https://example.com/logo2.png',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
  } as AccountDocument;

  beforeEach(async () => {
    const mockAccountsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const mockCustomersService = {
      deleteAllByAccount: jest.fn()
    };

    const mockUsersService = {
      deleteAllByAccount: jest.fn()
    };

    const mockProductsService = {
      deleteAllByAccount: jest.fn()
    };

    const mockQuotesService = {
      deleteAllByAccount: jest.fn()
    };

    const mockServiceOrdersService = {
      deleteAllByAccount: jest.fn()
    };

    const mockServicesService = {
      deleteAllByAccount: jest.fn()
    };

    const mockTechniciansService = {
      deleteAllByAccount: jest.fn()
    };

    const mockEventsService = {
      deleteAllByAccount: jest.fn()
    };

    const mockFollowUpsService = {
      deleteAllByAccount: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: AccountsService,
          useValue: mockAccountsService
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService
        },
        {
          provide: UsersService,
          useValue: mockUsersService
        },
        {
          provide: ProductsService,
          useValue: mockProductsService
        },
        {
          provide: QuotesService,
          useValue: mockQuotesService
        },
        {
          provide: ServiceOrdersService,
          useValue: mockServiceOrdersService
        },
        {
          provide: ServicesService,
          useValue: mockServicesService
        },
        {
          provide: TechniciansService,
          useValue: mockTechniciansService
        },
        {
          provide: EventsService,
          useValue: mockEventsService
        },
        {
          provide: FollowUpsService,
          useValue: mockFollowUpsService
        }
      ]
    }).compile();

    service = module.get<AdminService>(AdminService);
    accountsService = module.get(AccountsService);
    customersService = module.get(CustomersService);
    usersService = module.get(UsersService);
    productsService = module.get(ProductsService);
    quotesService = module.get(QuotesService);
    serviceOrdersService = module.get(ServiceOrdersService);
    servicesService = module.get(ServicesService);
    techniciansService = module.get(TechniciansService);
    eventsService = module.get(EventsService);
    followUpsService = module.get(FollowUpsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllAccounts', () => {
    it('should return paginated accounts without search', async () => {
      const mockAccounts = [mockAccount, mockAccount2];
      accountsService.findAll.mockResolvedValue(mockAccounts);

      const result = await service.getAllAccounts(1, 10, '');

      expect(accountsService.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        accounts: [
          {
            id: mockAccount2._id.toString(),
            name: mockAccount2.name,
            plan: mockAccount2.plan,
            status: mockAccount2.status,
            logoUrl: mockAccount2.logoUrl,
            createdAt: mockAccount2.createdAt,
            expireDate: mockAccount2.expireDate
          },
          {
            id: mockAccount._id.toString(),
            name: mockAccount.name,
            plan: mockAccount.plan,
            status: mockAccount.status,
            logoUrl: mockAccount.logoUrl,
            createdAt: mockAccount.createdAt,
            expireDate: mockAccount.expireDate
          }
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should return paginated accounts with search by name', async () => {
      const mockAccounts = [mockAccount, mockAccount2];
      accountsService.findAll.mockResolvedValue(mockAccounts);

      const result = await service.getAllAccounts(1, 10, 'test');

      expect(accountsService.findAll).toHaveBeenCalled();
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].name).toBe('test-account');
      expect(result.total).toBe(1);
    });

    it('should return paginated accounts with search by id', async () => {
      const mockAccounts = [mockAccount, mockAccount2];
      accountsService.findAll.mockResolvedValue(mockAccounts);

      const result = await service.getAllAccounts(1, 10, mockAccount._id.toString());

      expect(accountsService.findAll).toHaveBeenCalled();
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].id).toBe(mockAccount._id.toString());
      expect(result.total).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      const mockAccounts = [mockAccount, mockAccount2];
      accountsService.findAll.mockResolvedValue(mockAccounts);

      const result = await service.getAllAccounts(1, 1, '');

      expect(result.accounts).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('should handle second page correctly', async () => {
      const mockAccounts = [mockAccount, mockAccount2];
      accountsService.findAll.mockResolvedValue(mockAccounts);

      const result = await service.getAllAccounts(2, 1, '');

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].id).toBe(mockAccount._id.toString());
      expect(result.page).toBe(2);
    });

    it('should return empty result when no accounts match search', async () => {
      const mockAccounts = [mockAccount, mockAccount2];
      accountsService.findAll.mockResolvedValue(mockAccounts);

      const result = await service.getAllAccounts(1, 10, 'nonexistent');

      expect(result.accounts).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('updateAccountStatus', () => {
    it('should update account status successfully', async () => {
      const updatedAccount = { ...mockAccount, status: 'active' as const };
      accountsService.update.mockResolvedValue(updatedAccount);

      const result = await service.updateAccountStatus(mockAccountId.toString(), 'active');

      expect(accountsService.update).toHaveBeenCalledWith(mockAccountId.toString(), { status: 'active' });
      expect(result).toEqual({
        id: updatedAccount._id.toString(),
        name: updatedAccount.name,
        plan: updatedAccount.plan,
        status: updatedAccount.status,
        logoUrl: updatedAccount.logoUrl
      });
    });

    it('should throw error if account not found', async () => {
      accountsService.update.mockResolvedValue(null);

      await expect(service.updateAccountStatus(mockAccountId.toString(), 'active')).rejects.toThrow('Account not found');
      expect(accountsService.update).toHaveBeenCalledWith(mockAccountId.toString(), { status: 'active' });
    });
  });

  describe('deleteAccount', () => {
    it('should delete account and all related data successfully', async () => {
      accountsService.findOne.mockResolvedValue(mockAccount);
      accountsService.delete.mockResolvedValue(mockAccount);

      // Mock all the cascade delete methods
      serviceOrdersService.deleteAllByAccount.mockResolvedValue(undefined);
      quotesService.deleteAllByAccount.mockResolvedValue(undefined);
      followUpsService.deleteAllByAccount.mockResolvedValue(undefined);
      eventsService.deleteAllByAccount.mockResolvedValue(undefined);
      customersService.deleteAllByAccount.mockResolvedValue(undefined);
      techniciansService.deleteAllByAccount.mockResolvedValue(undefined);
      servicesService.deleteAllByAccount.mockResolvedValue(undefined);
      productsService.deleteAllByAccount.mockResolvedValue(undefined);
      usersService.deleteAllByAccount.mockResolvedValue(undefined);

      const result = await service.deleteAccount(mockAccountId);

      expect(accountsService.findOne).toHaveBeenCalledWith(mockAccountId);

      // Verify cascade deletion order
      expect(serviceOrdersService.deleteAllByAccount).toHaveBeenCalledWith(mockAccountId);
      expect(quotesService.deleteAllByAccount).toHaveBeenCalledWith(mockAccountId);
      expect(followUpsService.deleteAllByAccount).toHaveBeenCalledWith(mockAccountId);
      expect(eventsService.deleteAllByAccount).toHaveBeenCalledWith(mockAccountId);
      expect(customersService.deleteAllByAccount).toHaveBeenCalledWith(mockAccountId);
      expect(techniciansService.deleteAllByAccount).toHaveBeenCalledWith(mockAccountId);
      expect(servicesService.deleteAllByAccount).toHaveBeenCalledWith(mockAccountId);
      expect(productsService.deleteAllByAccount).toHaveBeenCalledWith(mockAccountId);
      expect(usersService.deleteAllByAccount).toHaveBeenCalledWith(mockAccountId);
      expect(accountsService.delete).toHaveBeenCalledWith(mockAccountId);

      expect(result).toEqual({
        id: mockAccount._id.toString(),
        name: mockAccount.name,
        message: 'Account and all related data deleted successfully'
      });
    });

    it('should throw error if account not found', async () => {
      accountsService.findOne.mockResolvedValue(null);

      await expect(service.deleteAccount(mockAccountId)).rejects.toThrow('Account not found');
      expect(accountsService.findOne).toHaveBeenCalledWith(mockAccountId);

      // Verify no cascade deletions are called
      expect(serviceOrdersService.deleteAllByAccount).not.toHaveBeenCalled();
      expect(accountsService.delete).not.toHaveBeenCalled();
    });

    it('should throw error if account deletion fails', async () => {
      accountsService.findOne.mockResolvedValue(mockAccount);
      accountsService.delete.mockResolvedValue(null);

      // Mock cascade deletions to succeed
      serviceOrdersService.deleteAllByAccount.mockResolvedValue(undefined);
      quotesService.deleteAllByAccount.mockResolvedValue(undefined);
      followUpsService.deleteAllByAccount.mockResolvedValue(undefined);
      eventsService.deleteAllByAccount.mockResolvedValue(undefined);
      customersService.deleteAllByAccount.mockResolvedValue(undefined);
      techniciansService.deleteAllByAccount.mockResolvedValue(undefined);
      servicesService.deleteAllByAccount.mockResolvedValue(undefined);
      productsService.deleteAllByAccount.mockResolvedValue(undefined);
      usersService.deleteAllByAccount.mockResolvedValue(undefined);

      await expect(service.deleteAccount(mockAccountId)).rejects.toThrow('Failed to delete account');
    });
  });
});
