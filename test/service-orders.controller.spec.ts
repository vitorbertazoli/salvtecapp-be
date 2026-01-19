import { Test, TestingModule } from '@nestjs/testing';
import { ServiceOrdersController } from '../src/service-orders/service-orders.controller';
import { ServiceOrdersService } from '../src/service-orders/service-orders.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Types } from 'mongoose';
import { CreateServiceOrderDto } from '../src/service-orders/dto/create-service-order.dto';
import { CreateFromQuoteDto } from '../src/service-orders/dto/create-from-quote.dto';
import { UpdateServiceOrderDto } from '../src/service-orders/dto/update-service-order.dto';

describe('ServiceOrdersController', () => {
  let controller: ServiceOrdersController;
  let service: ServiceOrdersService;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockQuoteId = new Types.ObjectId();
  const mockTechnicianId = new Types.ObjectId();
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
        model: 'Test Model',
      },
    ],
    items: [
      {
        type: 'service',
        itemId: new Types.ObjectId(),
        name: 'AC Maintenance',
        quantity: 1,
        unitValue: 100.00,
        totalValue: 100.00,
      },
      {
        type: 'product',
        itemId: new Types.ObjectId(),
        name: 'Filter',
        quantity: 2,
        unitValue: 50.00,
        totalValue: 100.00,
      },
    ],
    description: 'Test service order',
    discount: 10,
    subtotal: 200.00,
    totalValue: 180.00,
    issuedAt: new Date('2024-01-01'),
    scheduledDate: new Date('2024-01-15'),
    status: 'pending',
    priority: 'normal',
    notes: 'Test notes',
    customerNotes: 'Customer notes',
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockServiceOrderArray = [mockServiceOrder];

  const mockServiceOrdersService = {
    create: jest.fn(),
    createFromQuote: jest.fn(),
    findByAccount: jest.fn(),
    findByCustomerAndAccount: jest.fn(),
    findByIdAndAccount: jest.fn(),
    updateByAccount: jest.fn(),
    deleteByAccount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceOrdersController],
      providers: [
        {
          provide: ServiceOrdersService,
          useValue: mockServiceOrdersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ServiceOrdersController>(ServiceOrdersController);
    service = module.get<ServiceOrdersService>(ServiceOrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a service order', async () => {
      const createServiceOrderDto: CreateServiceOrderDto = {
        quote: mockQuoteId.toString(),
        customer: mockCustomerId.toString(),
        items: [
          {
            type: 'service',
            itemId: 'item1',
            name: 'AC Maintenance',
            quantity: 1,
            unitValue: 100.00,
            totalValue: 100.00,
          },
        ],
        subtotal: 200.00,
        totalValue: 180.00,
        issuedAt: '2024-01-01',
      };

      const expectedServiceOrderData = {
        ...createServiceOrderDto,
        account: mockAccountId,
        createdBy: mockUserId,
        updatedBy: mockUserId,
      };

      mockServiceOrdersService.create.mockResolvedValue(mockServiceOrder);

      const result = await controller.create(createServiceOrderDto, mockAccountId, mockUserId);

      expect(mockServiceOrdersService.create).toHaveBeenCalledWith(expectedServiceOrderData);
      expect(result).toEqual(mockServiceOrder);
    });
  });

  describe('createFromQuote', () => {
    it('should create service order from quote', async () => {
      const createFromQuoteDto: CreateFromQuoteDto = {
        quoteId: mockQuoteId.toString(),
        priority: 'high',
      };

      mockServiceOrdersService.createFromQuote.mockResolvedValue(mockServiceOrder);

      const result = await controller.createFromQuote(createFromQuoteDto, mockAccountId);

      expect(mockServiceOrdersService.createFromQuote).toHaveBeenCalledWith(mockQuoteId.toString(), 'high', mockAccountId);
      expect(result).toEqual(mockServiceOrder);
    });
  });

  describe('findAll', () => {
    it('should return paginated service orders with default parameters', async () => {
      const mockResult = {
        serviceOrders: mockServiceOrderArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockServiceOrdersService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('1', '10', '', '', mockAccountId);

      expect(mockServiceOrdersService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined, undefined);
      expect(result).toEqual(mockResult);
    });

    it('should return paginated service orders with custom parameters', async () => {
      const mockResult = {
        serviceOrders: mockServiceOrderArray,
        total: 1,
        page: 2,
        limit: 20,
        totalPages: 1,
      };
      mockServiceOrdersService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('2', '20', 'search term', 'pending', mockAccountId, mockCustomerId.toString());

      expect(mockServiceOrdersService.findByAccount).toHaveBeenCalledWith(mockAccountId, 2, 20, 'search term', 'pending', mockCustomerId.toString());
      expect(result).toEqual(mockResult);
    });

    it('should handle invalid page and limit parameters', async () => {
      const mockResult = {
        serviceOrders: mockServiceOrderArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockServiceOrdersService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('invalid', 'invalid', '', '', mockAccountId);

      expect(mockServiceOrdersService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined, undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findByCustomer', () => {
    it('should return service orders for customer', async () => {
      mockServiceOrdersService.findByCustomerAndAccount.mockResolvedValue(mockServiceOrderArray);

      const result = await controller.findByCustomer(mockCustomerId.toString(), mockAccountId);

      expect(mockServiceOrdersService.findByCustomerAndAccount).toHaveBeenCalledWith(mockCustomerId.toString(), mockAccountId);
      expect(result).toEqual(mockServiceOrderArray);
    });
  });

  describe('findOne', () => {
    it('should return a single service order', async () => {
      mockServiceOrdersService.findByIdAndAccount.mockResolvedValue(mockServiceOrder);

      const result = await controller.findOne(mockServiceOrder._id.toString(), mockAccountId);

      expect(mockServiceOrdersService.findByIdAndAccount).toHaveBeenCalledWith(mockServiceOrder._id.toString(), mockAccountId);
      expect(result).toEqual(mockServiceOrder);
    });
  });

  describe('update', () => {
    it('should update a service order', async () => {
      const updateServiceOrderDto: UpdateServiceOrderDto = {
        status: 'in_progress',
        notes: 'Updated notes',
      };

      const expectedServiceOrderData = {
        ...updateServiceOrderDto,
        updatedBy: mockUserId,
      };

      mockServiceOrdersService.updateByAccount.mockResolvedValue({
        ...mockServiceOrder,
        ...updateServiceOrderDto,
      });

      const result = await controller.update(mockServiceOrder._id.toString(), updateServiceOrderDto, mockAccountId, mockUserId);

      expect(mockServiceOrdersService.updateByAccount).toHaveBeenCalledWith(mockServiceOrder._id.toString(), expectedServiceOrderData, mockAccountId);
      expect(result).toMatchObject({
        ...mockServiceOrder,
        ...updateServiceOrderDto,
      });
    });
  });

  describe('delete', () => {
    it('should delete a service order', async () => {
      mockServiceOrdersService.deleteByAccount.mockResolvedValue(mockServiceOrder);

      const result = await controller.delete(mockServiceOrder._id.toString(), mockAccountId);

      expect(mockServiceOrdersService.deleteByAccount).toHaveBeenCalledWith(mockServiceOrder._id.toString(), mockAccountId);
      expect(result).toEqual(mockServiceOrder);
    });
  });
});