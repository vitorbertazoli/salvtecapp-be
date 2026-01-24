import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { QuoteToServiceOrderService } from '../src/quote-to-service-order/quote-to-service-order.service';
import { ServiceOrder } from '../src/service-orders/schemas/service-order.schema';
import { ServiceOrdersService } from '../src/service-orders/service-orders.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2a$05$CUSTOM001abcdefghijk')
}));

describe('ServiceOrdersService', () => {
  let service: ServiceOrdersService;
  let serviceOrderModel: any;
  let quoteToServiceOrderService: any;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockQuoteId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

  const mockServiceOrder = {
    _id: new Types.ObjectId(),
    orderNumber: 'SO-2024-ABC12345',
    quote: mockQuoteId,
    customer: mockCustomerId,
    account: mockAccountId,
    equipments: [
      {
        name: 'AC Unit',
        room: 'Living Room',
        btus: 12000,
        type: 'Split',
        subType: 'Wall',
        maker: 'Test Maker',
        model: 'Test Model'
      }
    ],
    items: [
      {
        type: 'service',
        itemId: new Types.ObjectId(),
        name: 'AC Maintenance',
        quantity: 1,
        unitValue: 100.0,
        totalValue: 100.0
      },
      {
        type: 'product',
        itemId: new Types.ObjectId(),
        name: 'Filter',
        quantity: 2,
        unitValue: 50.0,
        totalValue: 100.0
      }
    ],
    description: 'Test service order',
    discount: 10,
    otherDiscounts: [
      {
        description: 'Loyalty Discount',
        amount: 10
      }
    ],
    subtotal: 200.0,
    totalValue: 180.0,
    issuedAt: new Date('2024-01-01'),
    scheduledDate: new Date('2024-01-15'),
    status: 'pending',
    priority: 'normal',
    notes: 'Test notes',
    customerNotes: 'Customer notes',
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockQuote = {
    _id: mockQuoteId,
    customer: mockCustomerId,
    account: mockAccountId,
    services: [
      {
        service: { _id: new Types.ObjectId(), name: 'AC Maintenance' },
        quantity: 1,
        unitValue: 100.0
      }
    ],
    products: [
      {
        product: { _id: new Types.ObjectId(), name: 'Filter' },
        quantity: 2,
        unitValue: 50.0
      }
    ],
    equipments: [
      {
        name: 'AC Unit',
        room: 'Living Room',
        btus: 12000,
        type: 'Split',
        subType: 'Wall',
        maker: 'Test Maker',
        model: 'Test Model'
      }
    ],
    description: 'Test quote description',
    discount: 10,
    otherDiscounts: [
      {
        description: 'Loyalty Discount',
        amount: 10
      }
    ],
    subtotal: 200.0,
    status: 'sent',
    totalValue: 200.0
  };

  const mockServiceOrderArray = [mockServiceOrder];

  beforeEach(async () => {
    const mockServiceOrderModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockServiceOrder,
        ...data,
        toObject: jest.fn().mockReturnValue({ ...mockServiceOrder, ...data })
      }),
      populate: jest.fn().mockReturnThis()
    }));

    // Add static methods
    mockServiceOrderModel.find = jest.fn();
    mockServiceOrderModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    mockServiceOrderModel.findOneAndUpdate = jest.fn();
    mockServiceOrderModel.findOneAndDelete = jest.fn();
    mockServiceOrderModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1)
    });
    mockServiceOrderModel.deleteMany = jest.fn();
    mockServiceOrderModel.aggregate = jest.fn();

    const mockQuoteToServiceOrderService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        {
          provide: getModelToken(ServiceOrder.name),
          useValue: mockServiceOrderModel
        },
        {
          provide: QuoteToServiceOrderService,
          useValue: mockQuoteToServiceOrderService
        }
      ]
    }).compile();

    service = module.get<ServiceOrdersService>(ServiceOrdersService);
    serviceOrderModel = module.get(getModelToken(ServiceOrder.name));
    quoteToServiceOrderService = module.get(QuoteToServiceOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a service order with generated order number', async () => {
      const serviceOrderData = {
        quote: mockQuoteId,
        customer: mockCustomerId,
        account: mockAccountId,
        items: mockServiceOrder.items,
        subtotal: 200.0,
        totalValue: 180.0,
        issuedAt: new Date('2024-01-01'),
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      const result = await service.create(serviceOrderData);

      expect(serviceOrderModel).toHaveBeenCalled();
      expect(result).toMatchObject({
        quote: mockQuoteId,
        customer: mockCustomerId,
        account: mockAccountId,
        subtotal: 200.0,
        totalValue: 180.0,
        orderNumber: expect.stringMatching(/^SO-\d{4}-[A-Z0-9]{8}$/)
      });
    });

    it('should create a service order with provided order number', async () => {
      const serviceOrderData = {
        orderNumber: 'SO-2024-CUSTOM001',
        quote: mockQuoteId,
        customer: mockCustomerId,
        account: mockAccountId,
        items: mockServiceOrder.items,
        subtotal: 200.0,
        totalValue: 180.0,
        issuedAt: new Date('2024-01-01'),
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      const result = await service.create(serviceOrderData);

      expect(serviceOrderModel).toHaveBeenCalledWith(serviceOrderData);
      expect(result.orderNumber).toBe('SO-2024-CUSTOM001');
    });
  });

  describe('findByAccount', () => {
    it('should return paginated service orders without search', async () => {
      const mockAggregateResult = mockServiceOrderArray;

      serviceOrderModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '', 'pending');

      expect(serviceOrderModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        serviceOrders: mockAggregateResult,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should return paginated service orders with search', async () => {
      const mockAggregateResult = mockServiceOrderArray;
      const mockCountResult = [{ total: 1 }];

      serviceOrderModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockAggregateResult)
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockCountResult)
        });

      const result = await service.findByAccount(mockAccountId, 1, 10, 'test', '');

      expect(serviceOrderModel.aggregate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        serviceOrders: mockAggregateResult,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should filter by customer when provided', async () => {
      const mockAggregateResult = mockServiceOrderArray;

      serviceOrderModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '', '', mockCustomerId.toString());

      expect(serviceOrderModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        serviceOrders: mockAggregateResult,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should handle pagination correctly', async () => {
      const mockAggregateResult = mockServiceOrderArray;

      serviceOrderModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findByAccount(mockAccountId, 2, 5, '', '');

      expect(result).toEqual({
        serviceOrders: mockAggregateResult,
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1
      });
    });
  });

  describe('findByIdAndAccount', () => {
    it('should return a service order by id and account', async () => {
      serviceOrderModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockServiceOrder)
      });

      const result = await service.findByIdAndAccount(mockServiceOrder._id.toString(), mockAccountId);

      expect(serviceOrderModel.findOne).toHaveBeenCalledWith({
        _id: mockServiceOrder._id.toString(),
        account: mockAccountId
      });
      expect(result).toEqual(mockServiceOrder);
    });

    it('should return null when service order not found', async () => {
      serviceOrderModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.findByIdAndAccount('invalid-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('updateByAccount', () => {
    it('should update a service order successfully', async () => {
      const updateData = {
        status: 'in_progress',
        notes: 'Updated notes',
        updatedBy: mockUserId
      };

      serviceOrderModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockServiceOrder,
          ...updateData
        })
      });

      const result = await service.updateByAccount(mockServiceOrder._id.toString(), updateData, mockAccountId);

      expect(serviceOrderModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockServiceOrder._id.toString(), account: mockAccountId }, updateData, {
        new: true
      });
      expect(result).toMatchObject({
        ...mockServiceOrder,
        ...updateData
      });
    });

    it('should return null when service order not found', async () => {
      serviceOrderModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.updateByAccount('invalid-id', { status: 'completed' }, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteByAccount', () => {
    it('should delete a service order successfully', async () => {
      serviceOrderModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockServiceOrder)
      });

      const result = await service.deleteByAccount(mockServiceOrder._id.toString(), mockAccountId);

      expect(serviceOrderModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockServiceOrder._id.toString(),
        account: mockAccountId
      });
      expect(result).toEqual(mockServiceOrder);
    });

    it('should return null when service order not found', async () => {
      serviceOrderModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.deleteByAccount('invalid-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteAllByAccount', () => {
    it('should delete all service orders for an account', async () => {
      const mockDeleteResult = { deletedCount: 5 };
      serviceOrderModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDeleteResult)
      });

      const result = await service.deleteAllByAccount(mockAccountId);

      expect(serviceOrderModel.deleteMany).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual(mockDeleteResult);
    });
  });

  describe('findByCustomerAndAccount', () => {
    it('should return service orders for customer and account', async () => {
      serviceOrderModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockServiceOrderArray)
      });

      const result = await service.findByCustomerAndAccount(mockCustomerId.toString(), mockAccountId);

      expect(serviceOrderModel.find).toHaveBeenCalledWith({
        customer: new Types.ObjectId(mockCustomerId.toString()),
        account: mockAccountId,
        status: { $in: ['pending', 'scheduled', 'in_progress'] }
      });
      expect(result).toEqual(mockServiceOrderArray);
    });
  });
});
