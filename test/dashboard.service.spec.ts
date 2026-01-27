import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../src/customers/schemas/customer.schema';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { Event, EventDocument } from '../src/events/schemas/event.schema';
import { PaymentOrder, PaymentOrderDocument } from '../src/payments/schemas/payment-order.schema';
import { Quote, QuoteDocument } from '../src/quotes/schemas/quote.schema';
import { ServiceOrder, ServiceOrderDocument } from '../src/service-orders/schemas/service-order.schema';
import { Technician, TechnicianDocument } from '../src/technicians/schemas/technician.schema';

describe('DashboardService', () => {
  let service: DashboardService;
  let customerModel: jest.Mocked<Model<CustomerDocument>>;
  let technicianModel: jest.Mocked<Model<TechnicianDocument>>;
  let quoteModel: jest.Mocked<Model<QuoteDocument>>;
  let serviceOrderModel: jest.Mocked<Model<ServiceOrderDocument>>;
  let eventModel: jest.Mocked<Model<EventDocument>>;
  let paymentOrderModel: jest.Mocked<Model<PaymentOrderDocument>>;

  const mockAccountId = new Types.ObjectId('507f1f77bcf86cd799439012');

  const mockStats = {
    customerCount: 25,
    technicianCount: 8,
    openQuotesCount: 12,
    openServiceOrdersCount: 5,
    todaysEventsCount: 3,
    totalReceived: 5000,
    totalOwed: 2000,
    expectedRevenue: 8000,
    monthlySalesData: [
      { date: '2024-01-01', sales: 1500 },
      { date: '2024-01-02', sales: 2200 },
      { date: '2024-01-03', sales: 0 }
    ]
  };

  beforeEach(async () => {
    const mockCustomerModel = {
      countDocuments: jest.fn()
    };

    const mockTechnicianModel = {
      countDocuments: jest.fn()
    };

    const mockQuoteModel = {
      countDocuments: jest.fn()
    };

    const mockServiceOrderModel = {
      countDocuments: jest.fn(),
      aggregate: jest.fn()
    };

    const mockEventModel = {
      countDocuments: jest.fn()
    };

    const mockPaymentOrderModel = {
      aggregate: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel
        },
        {
          provide: getModelToken(Technician.name),
          useValue: mockTechnicianModel
        },
        {
          provide: getModelToken(Quote.name),
          useValue: mockQuoteModel
        },
        {
          provide: getModelToken(ServiceOrder.name),
          useValue: mockServiceOrderModel
        },
        {
          provide: getModelToken(Event.name),
          useValue: mockEventModel
        },
        {
          provide: getModelToken(PaymentOrder.name),
          useValue: mockPaymentOrderModel
        }
      ]
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    customerModel = module.get(getModelToken(Customer.name));
    technicianModel = module.get(getModelToken(Technician.name));
    quoteModel = module.get(getModelToken(Quote.name));
    serviceOrderModel = module.get(getModelToken(ServiceOrder.name));
    eventModel = module.get(getModelToken(Event.name));
    paymentOrderModel = module.get(getModelToken(PaymentOrder.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return dashboard statistics successfully', async () => {
      // Mock countDocuments calls
      customerModel.countDocuments.mockResolvedValue(mockStats.customerCount);
      technicianModel.countDocuments.mockResolvedValue(mockStats.technicianCount);
      quoteModel.countDocuments.mockResolvedValue(mockStats.openQuotesCount);
      serviceOrderModel.countDocuments.mockResolvedValueOnce(mockStats.openServiceOrdersCount); // First call for open service orders
      eventModel.countDocuments.mockResolvedValue(mockStats.todaysEventsCount);

      // Mock aggregate for monthly sales data
      serviceOrderModel.aggregate.mockResolvedValue([
        { _id: '2024-01-01', total: 1500 },
        { _id: '2024-01-02', total: 2200 }
      ]);

      // Mock payment-related methods
      jest.spyOn(service as any, 'getPaymentStats').mockResolvedValue({
        totalReceived: mockStats.totalReceived,
        totalOwed: mockStats.totalOwed
      });
      jest.spyOn(service as any, 'getExpectedRevenue').mockResolvedValue(mockStats.expectedRevenue);
      jest.spyOn(service as any, 'getMonthlyPaymentData').mockResolvedValue(mockStats.monthlySalesData);

      const result = await service.getStats(mockAccountId);

      expect(customerModel.countDocuments).toHaveBeenCalledWith({ account: mockAccountId });
      expect(technicianModel.countDocuments).toHaveBeenCalledWith({ account: mockAccountId, status: 'active' });
      expect(quoteModel.countDocuments).toHaveBeenCalledWith({
        account: mockAccountId,
        status: { $nin: ['accepted', 'rejected'] }
      });
      expect(serviceOrderModel.countDocuments).toHaveBeenCalledWith({
        account: mockAccountId,
        status: { $nin: ['completed', 'cancelled'] }
      });
      expect(eventModel.countDocuments).toHaveBeenCalledWith({
        account: mockAccountId,
        date: expect.any(String),
        status: 'scheduled'
      });

      expect(result).toEqual({
        customerCount: mockStats.customerCount,
        technicianCount: mockStats.technicianCount,
        openQuotesCount: mockStats.openQuotesCount,
        openServiceOrdersCount: mockStats.openServiceOrdersCount,
        todaysEventsCount: mockStats.todaysEventsCount,
        totalReceived: mockStats.totalReceived,
        totalOwed: mockStats.totalOwed,
        expectedRevenue: mockStats.expectedRevenue,
        monthlySalesData: expect.any(Array)
      });
    });

    it('should handle zero counts', async () => {
      // Mock all counts as 0
      customerModel.countDocuments.mockResolvedValue(0);
      technicianModel.countDocuments.mockResolvedValue(0);
      quoteModel.countDocuments.mockResolvedValue(0);
      serviceOrderModel.countDocuments.mockResolvedValueOnce(0);
      eventModel.countDocuments.mockResolvedValue(0);

      // Mock empty aggregate result
      serviceOrderModel.aggregate.mockResolvedValue([]);

      // Mock payment methods to return zero
      jest.spyOn(service as any, 'getPaymentStats').mockResolvedValue({
        totalReceived: 0,
        totalOwed: 0
      });
      jest.spyOn(service as any, 'getExpectedRevenue').mockResolvedValue(0);
      jest.spyOn(service as any, 'getMonthlyPaymentData').mockResolvedValue([]);

      const result = await service.getStats(mockAccountId);

      expect(result).toEqual({
        customerCount: 0,
        technicianCount: 0,
        openQuotesCount: 0,
        openServiceOrdersCount: 0,
        todaysEventsCount: 0,
        totalReceived: 0,
        totalOwed: 0,
        expectedRevenue: 0,
        monthlySalesData: expect.any(Array)
      });
    });

    it('should handle monthly sales data aggregation', async () => {
      // Mock counts
      customerModel.countDocuments.mockResolvedValue(1);
      technicianModel.countDocuments.mockResolvedValue(1);
      quoteModel.countDocuments.mockResolvedValue(1);
      serviceOrderModel.countDocuments.mockResolvedValueOnce(1);
      eventModel.countDocuments.mockResolvedValue(1);

      // Mock sales data with recent dates
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(today.getDate() - 2);

      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      const salesData = [
        { _id: yesterday.toISOString().split('T')[0], total: 1000 },
        { _id: twoDaysAgo.toISOString().split('T')[0], total: 2000 }
      ];
      serviceOrderModel.aggregate.mockResolvedValue(salesData);

      // Mock payment methods
      jest.spyOn(service as any, 'getPaymentStats').mockResolvedValue({
        totalReceived: 1,
        totalOwed: 1
      });
      jest.spyOn(service as any, 'getExpectedRevenue').mockResolvedValue(1);
      jest.spyOn(service as any, 'getMonthlyPaymentData').mockResolvedValue([
        { date: yesterdayStr, sales: 1000 },
        { date: twoDaysAgoStr, sales: 2000 }
      ]);

      const result = await service.getStats(mockAccountId);

      expect(result.monthlySalesData).toBeDefined();
      expect(Array.isArray(result.monthlySalesData)).toBe(true);

      // Check that dates with sales are included and have correct values
      const salesMap = result.monthlySalesData.reduce((acc, item) => {
        acc[item.date] = item.sales;
        return acc;
      }, {});

      expect(salesMap[yesterdayStr]).toBe(1000);
      expect(salesMap[twoDaysAgoStr]).toBe(2000);
    });
  });

  describe('getMonthlyPaymentData', () => {
    it('should aggregate monthly payment data correctly', async () => {
      const fromDate = new Date('2024-01-01');
      const paymentData = [
        { _id: '2024-01-01', total: 1500 },
        { _id: '2024-01-02', total: 2200 }
      ];

      paymentOrderModel.aggregate.mockResolvedValue(paymentData);

      const result = await (service as any).getMonthlyPaymentData(mockAccountId, fromDate);

      expect(paymentOrderModel.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            account: mockAccountId,
            'payments.paymentDate': { $gte: fromDate }
          }
        },
        {
          $unwind: '$payments'
        },
        {
          $match: {
            'payments.paymentDate': { $gte: fromDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$payments.paymentDate'
              }
            },
            total: { $sum: '$payments.amount' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should fill missing dates with zero sales', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-03');

      // Mock only one day with sales
      paymentOrderModel.aggregate.mockResolvedValue([{ _id: '2024-01-02', total: 1000 }]);

      const result = await (service as any).getMonthlyPaymentData(mockAccountId, fromDate);

      // Should include all dates from fromDate to today
      expect(result.length).toBeGreaterThanOrEqual(3); // At least 3 days

      // Find the specific dates
      const day1 = result.find((item) => item.date === '2024-01-01');
      const day2 = result.find((item) => item.date === '2024-01-02');
      const day3 = result.find((item) => item.date === '2024-01-03');

      expect(day1?.sales).toBe(0);
      expect(day2?.sales).toBe(1000);
      expect(day3?.sales).toBe(0);
    });
  });
});
