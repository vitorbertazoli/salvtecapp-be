import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { PaymentsController } from '../src/payments/payments.controller';
import { PaymentsService } from '../src/payments/payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockServiceOrderId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

  const mockPaymentOrder = {
    _id: new Types.ObjectId(),
    account: mockAccountId,
    customer: mockCustomerId,
    serviceOrder: mockServiceOrderId,
    paymentStatus: 'pending',
    paidAmount: 0,
    totalAmount: 1000,
    paymentMethod: 'credit_card',
    paymentDate: new Date(),
    dueDate: new Date(),
    invoiceNumber: 'INV-001',
    notes: 'Test payment',
    discountAmount: 0,
    taxAmount: 100,
    transactionId: 'txn_123',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockPaymentOrderArray = [mockPaymentOrder];

  const mockPaymentSimulation = {
    frequency: 'monthly',
    contractValue: 900,
    netContractValue: 900,
    totalInstallments: 3,
    installments: [
      {
        installmentNumber: 1,
        totalInstallments: 3,
        dueDate: new Date('2026-01-01'),
        totalAmount: 300,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-02-01')
      }
    ]
  };

  const mockPaymentsService = {
    createFromServiceOrder: jest.fn(),
    createFromContract: jest.fn(),
    simulateContractPayments: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createFromServiceOrder', () => {
    it('should create a payment order from service order', async () => {
      mockPaymentsService.createFromServiceOrder.mockResolvedValue(mockPaymentOrder);

      const result = await controller.createFromServiceOrder(mockAccountId, mockServiceOrderId.toString(), mockUserId.toString());

      expect(mockPaymentsService.createFromServiceOrder).toHaveBeenCalledWith(mockAccountId, mockServiceOrderId.toString(), expect.anything());
      expect(result).toEqual(mockPaymentOrder);
    });
  });

  describe('simulateContractPayments', () => {
    it('should return payment simulation based on provided contract data', async () => {
      const dto = {
        startDate: '2026-01-01',
        expireDate: '2026-03-01',
        firstPaymentDate: '2026-01-01',
        paymentFrequency: 'monthly',
        value: 900
      };

      mockPaymentsService.simulateContractPayments.mockResolvedValue(mockPaymentSimulation);

      const result = await controller.simulateContractPayments(dto as any);

      expect(mockPaymentsService.simulateContractPayments).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockPaymentSimulation);
    });

    it('should preserve contiguous installment periods in simulation response', async () => {
      const dto = {
        startDate: '2026-03-16T00:00:00.000Z',
        expireDate: '2027-03-17T00:00:00.000Z',
        firstPaymentDate: '2026-03-16T00:00:00.000Z',
        paymentFrequency: 'monthly',
        value: 26480
      };

      const contiguousSimulation = {
        frequency: 'monthly',
        contractValue: 26480,
        netContractValue: 26480,
        totalInstallments: 13,
        installments: [
          {
            installmentNumber: 1,
            totalInstallments: 13,
            dueDate: new Date('2026-03-16T00:00:00.000Z'),
            totalAmount: 2036.93,
            periodStart: new Date('2026-03-16T00:00:00.000Z'),
            periodEnd: new Date('2026-04-16T00:00:00.000Z')
          },
          {
            installmentNumber: 2,
            totalInstallments: 13,
            dueDate: new Date('2026-04-16T00:00:00.000Z'),
            totalAmount: 2036.93,
            periodStart: new Date('2026-04-16T00:00:00.000Z'),
            periodEnd: new Date('2026-05-16T00:00:00.000Z')
          }
        ]
      };

      mockPaymentsService.simulateContractPayments.mockResolvedValueOnce(contiguousSimulation);

      const result = await controller.simulateContractPayments(dto as any);

      expect(mockPaymentsService.simulateContractPayments).toHaveBeenCalledWith(dto);
      expect(result.installments[1].periodStart.toISOString()).toBe(result.installments[0].periodEnd.toISOString());
    });
  });

  describe('findAll', () => {
    it('should return paginated payment orders with default parameters', async () => {
      const mockResult = { data: mockPaymentOrderArray, total: 1 };
      mockPaymentsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockAccountId);

      expect(mockPaymentsService.findAll).toHaveBeenCalledWith(mockAccountId, 1, 10, '', []);
      expect(result).toEqual(mockResult);
    });

    it('should return paginated payment orders with custom parameters', async () => {
      const mockResult = { data: mockPaymentOrderArray, total: 1 };
      mockPaymentsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockAccountId, 2, 20, 'search term', 'paid');

      expect(mockPaymentsService.findAll).toHaveBeenCalledWith(mockAccountId, 2, 20, 'search term', ['paid']);
      expect(result).toEqual(mockResult);
    });

    it('should handle empty string parameters as defaults', async () => {
      const mockResult = { data: mockPaymentOrderArray, total: 1 };
      mockPaymentsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockAccountId, undefined, undefined, '', '');

      expect(mockPaymentsService.findAll).toHaveBeenCalledWith(mockAccountId, 1, 10, '', []);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return a single payment order', async () => {
      mockPaymentsService.findOne.mockResolvedValue(mockPaymentOrder);

      const result = await controller.findOne(mockPaymentOrder._id.toString(), mockAccountId);

      expect(mockPaymentsService.findOne).toHaveBeenCalledWith(mockPaymentOrder._id.toString(), mockAccountId);
      expect(result).toEqual(mockPaymentOrder);
    });
  });

  describe('remove', () => {
    it('should delete a payment order', async () => {
      mockPaymentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockPaymentOrder._id.toString(), mockAccountId);

      expect(mockPaymentsService.remove).toHaveBeenCalledWith(mockPaymentOrder._id.toString(), mockAccountId);
      expect(result).toEqual({ message: 'Payment order deleted successfully' });
    });
  });
});
