import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Contract } from '../src/contracts/schemas/contract.schema';
import { PaymentsService } from '../src/payments/payments.service';
import { PaymentOrder } from '../src/payments/schemas/payment-order.schema';
import { ServiceOrder } from '../src/service-orders/schemas/service-order.schema';
import { ServiceOrdersService } from '../src/service-orders/service-orders.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentOrderModel: any;
  let serviceOrderModel: any;
  let contractModel: any;
  let serviceOrdersService: any;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockServiceOrderId = new Types.ObjectId();
  const mockContractId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

  const mockServiceOrder = {
    _id: mockServiceOrderId,
    account: mockAccountId,
    customer: mockCustomerId,
    orderNumber: 'SO-001',
    description: 'Test service order',
    totalValue: 1000,
    status: 'approved'
  };

  const mockContract = {
    _id: mockContractId,
    account: mockAccountId,
    customer: mockCustomerId,
    status: 'active',
    frequency: 'monthly',
    paymentFrequency: 'monthly',
    value: 1000.01,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    firstPaymentDate: new Date('2026-01-01T00:00:00.000Z'),
    expireDate: new Date('2026-03-01T00:00:00.000Z')
  };

  const execMock = <T>(value: T) => ({
    exec: jest.fn().mockResolvedValue(value)
  });

  beforeEach(async () => {
    const mockPaymentOrderModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...data,
        _id: new Types.ObjectId()
      }),
      populate: jest.fn().mockReturnThis()
    }));

    mockPaymentOrderModel.findOne = jest.fn();
    mockPaymentOrderModel.find = jest.fn();
    mockPaymentOrderModel.findOneAndDelete = jest.fn();
    mockPaymentOrderModel.deleteMany = jest.fn();
    mockPaymentOrderModel.countDocuments = jest.fn();
    mockPaymentOrderModel.aggregate = jest.fn();
    mockPaymentOrderModel.insertMany = jest.fn();

    const mockServiceOrderModel = {
      findOne: jest.fn()
    };

    const mockContractModel = {
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
          provide: getModelToken(Contract.name),
          useValue: mockContractModel
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
    contractModel = module.get(getModelToken(Contract.name));
    serviceOrdersService = module.get(ServiceOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFromServiceOrder', () => {
    it('should create a payment order from service order successfully', async () => {
      serviceOrderModel.findOne.mockReturnValue(execMock(mockServiceOrder));

      const result = await service.createFromServiceOrder(mockAccountId, mockServiceOrderId.toString(), mockUserId);

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
        payments: [],
        totalAmount: 1000
      });
    });

    it('should throw NotFoundException when service order not found', async () => {
      serviceOrderModel.findOne.mockReturnValue(execMock(null));

      await expect(service.createFromServiceOrder(mockAccountId, 'invalid-id', mockUserId)).rejects.toThrow(NotFoundException);
      expect(serviceOrdersService.updateByAccount).not.toHaveBeenCalled();
    });
  });

  describe('createFromContract', () => {
    it('should split contract total amount across installments and preserve total', async () => {
      contractModel.findOne.mockReturnValue(execMock(mockContract));
      paymentOrderModel.countDocuments.mockReturnValue(execMock(0));
      paymentOrderModel.insertMany.mockImplementation(async (docs: any[]) => docs);

      const result = await service.createFromContract(mockAccountId, mockContractId.toString(), mockUserId);

      expect(paymentOrderModel.insertMany).toHaveBeenCalledTimes(1);
      const insertedDocs = paymentOrderModel.insertMany.mock.calls[0][0];

      expect(insertedDocs).toHaveLength(3);
      expect(insertedDocs[0].installmentNumber).toBe(1);
      expect(insertedDocs[1].installmentNumber).toBe(2);
      expect(insertedDocs[2].installmentNumber).toBe(3);

      const amounts = insertedDocs.map((doc: any) => doc.totalAmount);
      expect(amounts[0]).toBeCloseTo(333.34, 2);
      expect(amounts[1]).toBeCloseTo(333.34, 2);
      expect(amounts[2]).toBeCloseTo(333.33, 2);

      const totalGenerated = amounts.reduce((sum: number, value: number) => sum + value, 0);
      expect(totalGenerated).toBeCloseTo(mockContract.value, 2);
      expect(result).toHaveLength(3);
    });

    it('should throw NotFoundException when contract is not found', async () => {
      contractModel.findOne.mockReturnValue(execMock(null));

      await expect(service.createFromContract(mockAccountId, 'invalid-contract-id', mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when payment orders already exist for contract', async () => {
      contractModel.findOne.mockReturnValue(execMock(mockContract));
      paymentOrderModel.countDocuments.mockReturnValue(execMock(2));

      await expect(service.createFromContract(mockAccountId, mockContractId.toString(), mockUserId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('regenerateFromContract', () => {
    it('should return empty array when there are no existing payment orders', async () => {
      paymentOrderModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue(execMock([]))
      });

      const result = await service.regenerateFromContract(mockAccountId, mockContractId.toString(), mockUserId);

      expect(result).toEqual([]);
      expect(paymentOrderModel.deleteMany).not.toHaveBeenCalled();
      expect(paymentOrderModel.insertMany).not.toHaveBeenCalled();
    });

    it('should regenerate using full contract total when no payments were recorded', async () => {
      paymentOrderModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue(
          execMock([
            { paymentStatus: 'pending', payments: [] },
            { paymentStatus: 'pending', payments: [] }
          ])
        )
      });
      paymentOrderModel.deleteMany.mockReturnValue(execMock({ deletedCount: 2 }));
      contractModel.findOne.mockReturnValue(execMock(mockContract));
      paymentOrderModel.countDocuments.mockReturnValue(execMock(0));
      paymentOrderModel.insertMany.mockImplementation(async (docs: any[]) => docs);

      const result = await service.regenerateFromContract(mockAccountId, mockContractId.toString(), mockUserId);

      expect(paymentOrderModel.deleteMany).toHaveBeenCalledWith({ account: mockAccountId, contract: mockContractId });
      expect(result).toHaveLength(3);
      const totalGenerated = result.reduce((sum, paymentOrder) => sum + paymentOrder.totalAmount, 0);
      expect(totalGenerated).toBeCloseTo(mockContract.value, 2);
    });

    it('should regenerate and deduct already paid amount from the new schedule', async () => {
      paymentOrderModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue(
          execMock([
            {
              paymentStatus: 'partial',
              payments: [{ amount: 200.12 }, { amount: 99.88 }]
            },
            {
              paymentStatus: 'pending',
              payments: [{ amount: 50 }]
            }
          ])
        )
      });
      paymentOrderModel.deleteMany.mockReturnValue(execMock({ deletedCount: 2 }));
      contractModel.findOne.mockReturnValue(execMock(mockContract));
      paymentOrderModel.countDocuments.mockReturnValue(execMock(0));
      paymentOrderModel.insertMany.mockImplementation(async (docs: any[]) => docs);

      const result = await service.regenerateFromContract(mockAccountId, mockContractId.toString(), mockUserId);

      expect(result).toHaveLength(3);
      const totalGenerated = result.reduce((sum, paymentOrder) => sum + paymentOrder.totalAmount, 0);
      const expectedRemaining = mockContract.value - 350;
      expect(totalGenerated).toBeCloseTo(expectedRemaining, 2);
    });

    it('should not create new payment orders when already paid amount covers the contract total', async () => {
      paymentOrderModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue(
          execMock([
            {
              paymentStatus: 'paid',
              payments: [{ amount: 1000.01 }]
            }
          ])
        )
      });
      paymentOrderModel.deleteMany.mockReturnValue(execMock({ deletedCount: 1 }));
      contractModel.findOne.mockReturnValue(execMock(mockContract));
      paymentOrderModel.countDocuments.mockReturnValue(execMock(0));

      const result = await service.regenerateFromContract(mockAccountId, mockContractId.toString(), mockUserId);

      expect(result).toEqual([]);
      expect(paymentOrderModel.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('findByContract', () => {
    it('should throw NotFoundException when contract does not exist for account', async () => {
      contractModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue(execMock(null))
      });

      await expect(service.findByContract(mockAccountId, mockContractId.toString())).rejects.toThrow(NotFoundException);
    });

    it('should return payment orders with paid and remaining totals', async () => {
      contractModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue(execMock(mockContract))
      });

      const paymentOrders = [
        {
          totalAmount: 500,
          discountAmount: 0,
          taxAmount: 0,
          payments: [{ amount: 120 }]
        },
        {
          totalAmount: 500.01,
          discountAmount: 0,
          taxAmount: 0,
          payments: [{ amount: 80 }]
        }
      ];

      paymentOrderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue(execMock(paymentOrders))
      });

      const result = await service.findByContract(mockAccountId, mockContractId.toString());

      expect(result.paymentOrders).toEqual(paymentOrders);
      expect(result.contractValue).toBeCloseTo(mockContract.value, 2);
      expect(result.totalScheduled).toBeCloseTo(1000.01, 2);
      expect(result.totalPaid).toBeCloseTo(200, 2);
      expect(result.totalRemaining).toBeCloseTo(800.01, 2);
    });

    it('should infer paid amount from schedule gap when regenerated orders were reduced', async () => {
      contractModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue(execMock(mockContract))
      });

      const paymentOrders = [
        {
          totalAmount: 300,
          discountAmount: 0,
          taxAmount: 0,
          payments: []
        },
        {
          totalAmount: 300,
          discountAmount: 0,
          taxAmount: 0,
          payments: []
        }
      ];

      paymentOrderModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue(execMock(paymentOrders))
      });

      const result = await service.findByContract(mockAccountId, mockContractId.toString());

      expect(result.totalScheduled).toBeCloseTo(600, 2);
      expect(result.totalPaid).toBeCloseTo(400.01, 2);
      expect(result.totalRemaining).toBeCloseTo(600, 2);
    });
  });

  describe('simulateContractPayments', () => {
    it('should simulate installments with the same splitting logic used by real payment creation', async () => {
      const result = await service.simulateContractPayments({
        startDate: '2026-01-01',
        expireDate: '2026-03-01',
        firstPaymentDate: '2026-01-01',
        paymentFrequency: 'monthly',
        value: 1000.01
      });

      expect(result.totalInstallments).toBe(3);
      expect(result.installments).toHaveLength(3);
      expect(result.installments[0].totalAmount).toBeCloseTo(333.34, 2);
      expect(result.installments[1].totalAmount).toBeCloseTo(333.34, 2);
      expect(result.installments[2].totalAmount).toBeCloseTo(333.33, 2);
      const simulatedTotal = result.installments.reduce((sum, installment) => sum + installment.totalAmount, 0);
      expect(simulatedTotal).toBeCloseTo(1000.01, 2);
    });

    it('should apply deduction when simulating remaining installments', async () => {
      const result = await service.simulateContractPayments({
        startDate: '2026-01-01',
        expireDate: '2026-03-01',
        firstPaymentDate: '2026-01-01',
        paymentFrequency: 'monthly',
        value: 1000.01,
        amountToDeduct: 350
      });

      const simulatedTotal = result.installments.reduce((sum, installment) => sum + installment.totalAmount, 0);
      expect(simulatedTotal).toBeCloseTo(650.01, 2);
      expect(result.netContractValue).toBeCloseTo(650.01, 2);
    });

    it('should build contiguous periods without duplicate ranges when first payment date matches start date', () => {
      const result = service.simulateContractPayments({
        startDate: '2026-03-16T00:00:00.000Z',
        expireDate: '2027-03-17T00:00:00.000Z',
        firstPaymentDate: '2026-03-16T00:00:00.000Z',
        paymentFrequency: 'monthly',
        value: 26480
      });

      expect(result.totalInstallments).toBe(13);
      expect(result.installments[0].periodStart.toISOString()).toBe('2026-03-16T00:00:00.000Z');
      expect(result.installments[0].periodEnd.toISOString()).toBe('2026-04-16T00:00:00.000Z');
      expect(result.installments[1].periodStart.toISOString()).toBe('2026-04-16T00:00:00.000Z');
      expect(result.installments[result.installments.length - 1].periodEnd.toISOString()).toBe('2027-03-17T00:00:00.000Z');

      for (let index = 1; index < result.installments.length; index += 1) {
        expect(result.installments[index].periodStart.toISOString()).toBe(result.installments[index - 1].periodEnd.toISOString());
      }
    });

    it('should throw for invalid first payment date range', () => {
      expect(() =>
        service.simulateContractPayments({
          startDate: '2026-01-01',
          expireDate: '2026-03-01',
          firstPaymentDate: '2026-04-01',
          paymentFrequency: 'monthly',
          value: 100
        })
      ).toThrow(BadRequestException);
    });
  });
});
