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
    updatedAt: new Date(),
  };

  const mockPaymentOrderArray = [mockPaymentOrder];

  const mockPaymentsService = {
    createFromServiceOrder: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
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

      const result = await controller.createFromServiceOrder(mockAccountId, mockServiceOrderId.toString());

      expect(mockPaymentsService.createFromServiceOrder).toHaveBeenCalledWith(mockAccountId, mockServiceOrderId.toString(), expect.anything());
      expect(result).toEqual(mockPaymentOrder);
    });
  });

  describe('findAll', () => {
    it('should return paginated payment orders with default parameters', async () => {
      const mockResult = { data: mockPaymentOrderArray, total: 1 };
      mockPaymentsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockAccountId);

      expect(mockPaymentsService.findAll).toHaveBeenCalledWith(mockAccountId, 1, 10, '', '');
      expect(result).toEqual(mockResult);
    });

    it('should return paginated payment orders with custom parameters', async () => {
      const mockResult = { data: mockPaymentOrderArray, total: 1 };
      mockPaymentsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockAccountId, 2, 20, 'search term', 'paid');

      expect(mockPaymentsService.findAll).toHaveBeenCalledWith(mockAccountId, 2, 20, 'search term', 'paid');
      expect(result).toEqual(mockResult);
    });

    it('should handle empty string parameters as defaults', async () => {
      const mockResult = { data: mockPaymentOrderArray, total: 1 };
      mockPaymentsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockAccountId, undefined, undefined, '', '');

      expect(mockPaymentsService.findAll).toHaveBeenCalledWith(mockAccountId, 1, 10, '', '');
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
      expect(result).toBeUndefined();
    });
  });
});