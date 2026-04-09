import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { ContractsController } from '../src/contracts/contracts.controller';
import { ContractsService } from '../src/contracts/contracts.service';
import { ApproveContractChangeOrderDto } from '../src/contracts/dto/approve-change-order.dto';
import { CreateContractChangeOrderDto } from '../src/contracts/dto/create-change-order.dto';
import { PaymentsService } from '../src/payments/payments.service';

describe('ContractsController', () => {
  let controller: ContractsController;
  let contractsService: jest.Mocked<ContractsService>;
  let paymentsService: jest.Mocked<PaymentsService>;

  const mockContractId = '507f1f77bcf86cd799439011';
  const mockAccountId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockCustomerId = '507f1f77bcf86cd799439013';
  const mockUserId = '507f1f77bcf86cd799439014';

  const mockContract = {
    _id: mockContractId,
    startDate: new Date('2024-01-01'),
    expireDate: new Date('2024-12-31'),
    status: 'active' as const,
    frequency: 'monthly' as const,
    terms: 'Test contract terms',
    value: 1000,
    customer: mockCustomerId,
    account: mockAccountId,
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockPaginatedResult = {
    contracts: [mockContract],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1
  };

  const mockContractPayments = {
    paymentOrders: [],
    contractValue: 1000,
    totalScheduled: 1000,
    totalPaid: 250,
    totalRemaining: 750
  };

  beforeEach(async () => {
    const mockContractsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByAccount: jest.fn(),
      findOne: jest.fn(),
      findByIdAndAccount: jest.fn(),
      createChangeOrder: jest.fn(),
      approveChangeOrder: jest.fn(),
      rejectChangeOrder: jest.fn(),
      deleteByAccount: jest.fn(),
      deleteAllByAccount: jest.fn()
    };

    const mockPaymentsService = {
      findByContract: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [
        {
          provide: ContractsService,
          useValue: mockContractsService
        },
        {
          provide: PaymentsService,
          useValue: mockPaymentsService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContractsController>(ContractsController);
    contractsService = module.get(ContractsService);
    paymentsService = module.get(PaymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated contracts with default parameters', async () => {
      contractsService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('1', '10', '', '', mockAccountId);

      expect(contractsService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should return paginated contracts with search and status', async () => {
      const search = 'test search';
      const status = 'active';
      contractsService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('2', '20', search, status, mockAccountId);

      expect(contractsService.findByAccount).toHaveBeenCalledWith(mockAccountId, 2, 20, search, [status]);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should handle invalid page and limit values', async () => {
      contractsService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('invalid', 'invalid', '', '', mockAccountId);

      expect(contractsService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return a contract by id', async () => {
      contractsService.findByIdAndAccount.mockResolvedValue(mockContract as any);

      const result = await controller.findOne(mockContractId, mockAccountId);

      expect(contractsService.findByIdAndAccount).toHaveBeenCalledWith(mockContractId, mockAccountId);
      expect(result).toEqual(mockContract);
    });

    it('should return null when contract not found', async () => {
      contractsService.findByIdAndAccount.mockResolvedValue(null);

      const result = await controller.findOne(mockContractId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('findPayments', () => {
    it('should return payments summary for a contract', async () => {
      paymentsService.findByContract.mockResolvedValue(mockContractPayments as any);

      const result = await controller.findPayments(mockContractId, mockAccountId);

      expect(paymentsService.findByContract).toHaveBeenCalledWith(mockAccountId, mockContractId);
      expect(result).toEqual(mockContractPayments);
    });
  });

  describe('remove', () => {
    it('should delete a contract successfully', async () => {
      contractsService.deleteByAccount.mockResolvedValue(mockContract as any);

      const result = await controller.remove(mockContractId, mockAccountId);

      expect(contractsService.deleteByAccount).toHaveBeenCalledWith(mockContractId, mockAccountId);
      expect(result).toEqual(mockContract);
    });

    it('should return null when contract not found', async () => {
      contractsService.deleteByAccount.mockResolvedValue(null);

      const result = await controller.remove(mockContractId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('createChangeOrder', () => {
    it('should create a contract change order', async () => {
      const dto: CreateContractChangeOrderDto = {
        value: 1900,
        terms: 'Adjusted terms',
        description: 'Annual adjustment'
      };

      contractsService.createChangeOrder.mockResolvedValue(mockContract as any);

      const result = await controller.createChangeOrder(mockContractId, dto, mockAccountId, mockUserId);

      expect(contractsService.createChangeOrder).toHaveBeenCalledWith(
        mockContractId,
        {
          terms: 'Adjusted terms',
          value: 1900
        },
        mockAccountId,
        new Types.ObjectId(mockUserId),
        'Annual adjustment'
      );
      expect(result).toEqual(mockContract);
    });

    it('should map service ids when services are provided', async () => {
      const dto: CreateContractChangeOrderDto = {
        services: [
          {
            service: '507f1f77bcf86cd799439099',
            quantity: 2,
            unitValue: 500
          }
        ]
      };

      contractsService.createChangeOrder.mockResolvedValue(mockContract as any);

      await controller.createChangeOrder(mockContractId, dto, mockAccountId, mockUserId);

      expect(contractsService.createChangeOrder).toHaveBeenCalledWith(
        mockContractId,
        {
          services: [
            {
              service: new Types.ObjectId('507f1f77bcf86cd799439099'),
              quantity: 2,
              unitValue: 500
            }
          ]
        },
        mockAccountId,
        new Types.ObjectId(mockUserId),
        undefined
      );
    });
  });

  describe('approveOrRejectChangeOrder', () => {
    it('should approve a change order', async () => {
      const dto: ApproveContractChangeOrderDto = {
        version: 1,
        action: 'approve'
      };

      contractsService.approveChangeOrder.mockResolvedValue(mockContract as any);

      const result = await controller.approveOrRejectChangeOrder(mockContractId, '1', dto, mockAccountId, mockUserId);

      expect(contractsService.approveChangeOrder).toHaveBeenCalledWith(mockContractId, 1, mockAccountId, new Types.ObjectId(mockUserId));
      expect(result).toEqual(mockContract);
    });

    it('should reject a change order', async () => {
      const dto: ApproveContractChangeOrderDto = {
        version: 1,
        action: 'reject'
      };

      contractsService.rejectChangeOrder.mockResolvedValue(mockContract as any);

      const result = await controller.approveOrRejectChangeOrder(mockContractId, '1', dto, mockAccountId, mockUserId);

      expect(contractsService.rejectChangeOrder).toHaveBeenCalledWith(mockContractId, 1, mockAccountId, new Types.ObjectId(mockUserId));
      expect(result).toEqual(mockContract);
    });
  });
});
