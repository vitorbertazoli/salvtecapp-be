import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../src/payments/payments.service';
import { PaymentOrder, PaymentOrderDocument } from '../src/payments/schemas/payment-order.schema';
import { ServiceOrder } from '../src/service-orders/schemas/service-order.schema';
import { ServiceOrdersService } from '../src/service-orders/service-orders.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentOrderModel: any;
  let serviceOrderModel: any;
  let serviceOrdersService: any;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockServiceOrderId = new Types.ObjectId();

  const mockServiceOrder = {
    _id: mockServiceOrderId,
    account: mockAccountId,
    customer: mockCustomerId,
    orderNumber: 'SO-001',
    description: 'Test service order',
    totalValue: 1000,
    status: 'approved'
  };

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

  beforeEach(async () => {
    const mockPaymentOrderModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockPaymentOrder,
        toObject: jest.fn().mockReturnValue(mockPaymentOrder)
      }),
      populate: jest.fn().mockReturnThis()
    }));

    // Add static methods
    mockPaymentOrderModel.find = jest.fn();
    mockPaymentOrderModel.findOne = jest.fn();
    mockPaymentOrderModel.findOneAndDelete = jest.fn();
    mockPaymentOrderModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1)
    });
    mockPaymentOrderModel.aggregate = jest.fn();

    const mockServiceOrderModel = {
      findOne: jest.fn()
    };

    const mockServiceOrdersService = {
      updateByAccount: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getModelToken(PaymentOrder.name),
          useValue: mockPaymentOrderModel
        },
        {
          provide: getModelToken(ServiceOrder.name),
          useValue: mockServiceOrderModel
        },
        {
          provide: ServiceOrdersService,
          useValue: mockServiceOrdersService
        }
      ]
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentOrderModel = module.get(getModelToken(PaymentOrder.name));
    serviceOrderModel = module.get(getModelToken(ServiceOrder.name));
    serviceOrdersService = module.get(ServiceOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFromServiceOrder', () => {
    it('should create a payment order from service order successfully', async () => {
      serviceOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockServiceOrder)
      });

      const result = await service.createFromServiceOrder(mockAccountId, mockServiceOrderId.toString());

      expect(serviceOrderModel.findOne).toHaveBeenCalledWith({
        account: mockAccountId,
        _id: mockServiceOrderId.toString()
      });
      expect(serviceOrdersService.updateByAccount).toHaveBeenCalledWith(mockServiceOrderId.toString(), { status: 'payment_order_created' }, mockAccountId);
      expect(result).toMatchObject({
        account: mockAccountId,
        customer: mockCustomerId,
        serviceOrder: mockServiceOrderId,
        paymentStatus: 'pending',
        paidAmount: 0,
        totalAmount: 1000
      });
    });

    it('should throw NotFoundException when service order not found', async () => {
      serviceOrderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.createFromServiceOrder(mockAccountId, 'invalid-id')).rejects.toThrow(NotFoundException);
      expect(serviceOrdersService.updateByAccount).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated payment orders without search', async () => {
      const mockAggregateResult = mockPaymentOrderArray;

      paymentOrderModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findAll(mockAccountId, 1, 10, '', 'pending');

      expect(paymentOrderModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockAggregateResult,
        total: 1
      });
    });

    it('should return paginated payment orders with search', async () => {
      const mockAggregateResult = mockPaymentOrderArray;
      const mockCountResult = [{ total: 1 }];

      paymentOrderModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockCountResult)
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockAggregateResult)
        });

      const result = await service.findAll(mockAccountId, 1, 10, 'test', '');

      expect(paymentOrderModel.aggregate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        data: mockAggregateResult,
        total: 1
      });
    });

    it('should filter by status when provided', async () => {
      const mockAggregateResult = mockPaymentOrderArray;

      paymentOrderModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findAll(mockAccountId, 1, 10, '', 'paid');

      expect(paymentOrderModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockAggregateResult,
        total: 1
      });
    });

    it('should handle pagination correctly', async () => {
      const mockAggregateResult = mockPaymentOrderArray;

      paymentOrderModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findAll(mockAccountId, 2, 5, '', '');

      expect(paymentOrderModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockAggregateResult,
        total: 1
      });
    });
  });

  describe('findOne', () => {
    it('should return a payment order by id and account', async () => {
      paymentOrderModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPaymentOrder)
      });

      const result = await service.findOne(mockPaymentOrder._id.toString(), mockAccountId);

      expect(paymentOrderModel.findOne).toHaveBeenCalledWith({
        _id: mockPaymentOrder._id.toString(),
        account: mockAccountId
      });
      expect(result).toEqual(mockPaymentOrder);
    });

    it('should throw NotFoundException when payment order not found', async () => {
      paymentOrderModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.findOne('invalid-id', mockAccountId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a payment order successfully', async () => {
      paymentOrderModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPaymentOrder)
      });

      await expect(service.remove(mockPaymentOrder._id.toString(), mockAccountId)).resolves.toBeUndefined();

      expect(paymentOrderModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockPaymentOrder._id.toString(),
        account: mockAccountId
      });
    });

    it('should throw NotFoundException when payment order not found', async () => {
      paymentOrderModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.remove('invalid-id', mockAccountId)).rejects.toThrow(NotFoundException);
    });
  });
});
