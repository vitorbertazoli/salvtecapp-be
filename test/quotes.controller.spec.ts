jest.mock('marked', () => ({
  marked: jest.fn((input) => `<p>${input}</p>`)
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { QuoteToServiceOrderService } from '../src/quote-to-service-order/quote-to-service-order.service';
import { CreateQuoteDto } from '../src/quotes/dto/create-quote.dto';
import { UpdateQuoteDto } from '../src/quotes/dto/update-quote.dto';
import { QuotesController } from '../src/quotes/quotes.controller';
import { QuotesService } from '../src/quotes/quotes.service';

describe('QuotesController', () => {
  let controller: QuotesController;
  let service: QuotesService;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockServiceId = new Types.ObjectId();
  const mockProductId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

  const mockQuote = {
    _id: new Types.ObjectId(),
    account: mockAccountId,
    customer: mockCustomerId,
    equipments: [
      {
        name: 'AC Unit',
        room: 'Living Room',
        btus: 12000,
        maker: 'Test Maker',
        model: 'Test Model'
      }
    ],
    services: [
      {
        service: mockServiceId,
        quantity: 1,
        unitValue: 100.0
      }
    ],
    products: [
      {
        product: mockProductId,
        quantity: 2,
        unitValue: 50.0
      }
    ],
    totalValue: 200.0,
    description: 'Test quote description',
    discount: 10,
    otherDiscounts: [
      {
        description: 'Special discount',
        amount: 20.0
      }
    ],
    status: 'draft',
    validUntil: new Date('2024-12-31'),
    issuedAt: new Date('2024-01-01'),
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockQuoteArray = [mockQuote];

  const mockQuotesService = {
    create: jest.fn(),
    findByAccount: jest.fn(),
    findByIdAndAccount: jest.fn(),
    updateByAccount: jest.fn(),
    sendQuote: jest.fn(),
    deleteByAccount: jest.fn()
  };

  const mockQuoteToServiceOrderService = {
    findByIdAndAccount: jest.fn(),
    updateByAccount: jest.fn(),
    createFromQuote: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotesController],
      providers: [
        {
          provide: QuotesService,
          useValue: mockQuotesService
        },
        {
          provide: QuoteToServiceOrderService,
          useValue: mockQuoteToServiceOrderService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<QuotesController>(QuotesController);
    service = module.get<QuotesService>(QuotesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a quote', async () => {
      const createQuoteDto: CreateQuoteDto = {
        customer: mockCustomerId.toString(),
        services: [
          {
            service: mockServiceId.toString(),
            quantity: 1,
            unitValue: 100.0
          }
        ],
        products: [
          {
            product: mockProductId.toString(),
            quantity: 2,
            unitValue: 50.0
          }
        ],
        totalValue: 200.0,
        validUntil: '2024-12-31'
      };

      const expectedQuoteData = {
        ...createQuoteDto,
        account: mockAccountId,
        customer: new Types.ObjectId(mockCustomerId.toString()),
        services: [
          {
            ...createQuoteDto.services![0],
            service: new Types.ObjectId(mockServiceId.toString())
          }
        ],
        products: [
          {
            ...createQuoteDto.products![0],
            product: new Types.ObjectId(mockProductId.toString())
          }
        ],
        status: 'draft',
        issuedAt: expect.any(Date),
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      mockQuotesService.create.mockResolvedValue(mockQuote);

      const result = await controller.create(createQuoteDto, mockAccountId, mockUserId);

      expect(mockQuotesService.create).toHaveBeenCalledWith(expectedQuoteData);
      expect(result).toEqual(mockQuote);
    });

    it('should create a quote with minimal data', async () => {
      const createQuoteDto: CreateQuoteDto = {
        customer: mockCustomerId.toString(),
        totalValue: 100.0,
        validUntil: '2024-12-31'
      };

      const expectedQuoteData = {
        ...createQuoteDto,
        account: mockAccountId,
        customer: new Types.ObjectId(mockCustomerId.toString()),
        status: 'draft',
        issuedAt: expect.any(Date),
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      mockQuotesService.create.mockResolvedValue(mockQuote);

      const result = await controller.create(createQuoteDto, mockAccountId, mockUserId);

      expect(mockQuotesService.create).toHaveBeenCalledWith(expectedQuoteData);
      expect(result).toEqual(mockQuote);
    });
  });

  describe('findAll', () => {
    it('should return paginated quotes with default parameters', async () => {
      const mockResult = {
        quotes: mockQuoteArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      mockQuotesService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('1', '10', '', '', mockAccountId);

      expect(mockQuotesService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined, undefined);
      expect(result).toEqual(mockResult);
    });

    it('should return paginated quotes with custom parameters', async () => {
      const mockResult = {
        quotes: mockQuoteArray,
        total: 1,
        page: 2,
        limit: 20,
        totalPages: 1
      };
      mockQuotesService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('2', '20', 'search term', '', mockAccountId, mockCustomerId.toString());

      expect(mockQuotesService.findByAccount).toHaveBeenCalledWith(mockAccountId, 2, 20, 'search term', undefined, mockCustomerId.toString());
      expect(result).toEqual(mockResult);
    });

    it('should handle invalid page and limit parameters', async () => {
      const mockResult = {
        quotes: mockQuoteArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      mockQuotesService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('invalid', 'invalid', '', '', mockAccountId);

      expect(mockQuotesService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined, undefined);
      expect(result).toEqual(mockResult);
    });

    it('should filter by status when provided', async () => {
      const mockResult = {
        quotes: mockQuoteArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      mockQuotesService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('1', '10', '', 'sent', mockAccountId);

      expect(mockQuotesService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', 'sent', undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return a single quote', async () => {
      mockQuoteToServiceOrderService.findByIdAndAccount.mockResolvedValue(mockQuote);

      const result = await controller.findOne(mockQuote._id.toString(), mockAccountId);

      expect(mockQuoteToServiceOrderService.findByIdAndAccount).toHaveBeenCalledWith(mockQuote._id.toString(), mockAccountId);
      expect(result).toEqual(mockQuote);
    });
  });

  describe('update', () => {
    it('should update a quote', async () => {
      const updateQuoteDto: UpdateQuoteDto = {
        description: 'Updated description',
        totalValue: 250.0
      };

      const expectedQuoteData = {
        ...updateQuoteDto,
        updatedBy: new Types.ObjectId(mockUserId)
      };

      mockQuoteToServiceOrderService.updateByAccount.mockResolvedValue({
        ...mockQuote,
        ...updateQuoteDto
      });

      const result = await controller.update(mockQuote._id.toString(), updateQuoteDto, mockAccountId, mockUserId);

      expect(mockQuoteToServiceOrderService.updateByAccount).toHaveBeenCalledWith(
        mockQuote._id.toString(),
        expectedQuoteData,
        mockAccountId,
        new Types.ObjectId(mockUserId)
      );
      expect(result).toMatchObject({
        ...mockQuote,
        ...updateQuoteDto
      });
    });

    it('should update a quote with customer change', async () => {
      const updateQuoteDto: UpdateQuoteDto = {
        customer: mockCustomerId.toString()
      };

      const expectedQuoteData = {
        ...updateQuoteDto,
        customer: new Types.ObjectId(mockCustomerId.toString()),
        updatedBy: new Types.ObjectId(mockUserId)
      };

      mockQuoteToServiceOrderService.updateByAccount.mockResolvedValue({
        ...mockQuote,
        customer: mockCustomerId
      });

      const result = await controller.update(mockQuote._id.toString(), updateQuoteDto, mockAccountId, mockUserId);

      expect(mockQuoteToServiceOrderService.updateByAccount).toHaveBeenCalledWith(
        mockQuote._id.toString(),
        expectedQuoteData,
        mockAccountId,
        new Types.ObjectId(mockUserId)
      );
      expect(result).toMatchObject({
        ...mockQuote,
        customer: mockCustomerId
      });
    });
  });

  describe('send', () => {
    it('should send a quote', async () => {
      const mockSendResult = { success: true, message: 'Quote sent successfully' };
      mockQuotesService.sendQuote.mockResolvedValue(mockSendResult);

      const result = await controller.send(mockQuote._id.toString(), mockAccountId, mockUserId);

      expect(mockQuotesService.sendQuote).toHaveBeenCalledWith(mockQuote._id.toString(), mockAccountId, mockUserId);
      expect(result).toEqual(mockSendResult);
    });
  });

  describe('remove', () => {
    it('should delete a quote', async () => {
      mockQuotesService.deleteByAccount.mockResolvedValue(mockQuote);

      const result = await controller.remove(mockQuote._id.toString(), mockAccountId);

      expect(mockQuotesService.deleteByAccount).toHaveBeenCalledWith(mockQuote._id.toString(), mockAccountId);
      expect(result).toEqual(mockQuote);
    });
  });
});
