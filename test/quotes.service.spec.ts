jest.mock('marked', () => ({
  marked: jest.fn((input) => `<p>${input}</p>`)
}));

import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AccountsService } from '../src/accounts/accounts.service';
import { QuoteToServiceOrderService } from '../src/quote-to-service-order/quote-to-service-order.service';
import { QuotesService } from '../src/quotes/quotes.service';
import { Quote } from '../src/quotes/schemas/quote.schema';
import { EmailService } from '../src/utils/email.service';
import { AppGateway } from '../src/websocket/app.gateway';

describe('QuotesService', () => {
  let service: QuotesService;
  let quoteModel: any;
  let emailService: any;

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
        type: 'Split',
        subType: 'Wall',
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

  beforeEach(async () => {
    const mockQuoteModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockQuote,
        toObject: jest.fn().mockReturnValue(mockQuote)
      }),
      populate: jest.fn().mockReturnThis()
    }));

    // Add static methods
    mockQuoteModel.find = jest.fn();
    mockQuoteModel.findOne = jest.fn();
    mockQuoteModel.findOneAndUpdate = jest.fn();
    mockQuoteModel.findOneAndDelete = jest.fn();
    mockQuoteModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1)
    });
    mockQuoteModel.deleteMany = jest.fn();
    mockQuoteModel.aggregate = jest.fn();

    const mockEmailService = {
      sendEmail: jest.fn()
    };

    const mockQuoteToServiceOrderService = {
      createFromQuote: jest.fn(),
      updateByAccount: jest.fn()
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return undefined;
      })
    };

    const mockAccountsService = {
      findOne: jest.fn(),
      getCustomizations: jest.fn()
    };

    const mockAppGateway = {
      broadcastToAccount: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        {
          provide: getModelToken(Quote.name),
          useValue: mockQuoteModel
        },
        {
          provide: EmailService,
          useValue: mockEmailService
        },
        {
          provide: QuoteToServiceOrderService,
          useValue: mockQuoteToServiceOrderService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: AppGateway,
          useValue: mockAppGateway
        },
        {
          provide: AccountsService,
          useValue: mockAccountsService
        }
      ]
    }).compile();

    service = module.get<QuotesService>(QuotesService);
    quoteModel = module.get(getModelToken(Quote.name));
    emailService = module.get(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a quote successfully', async () => {
      const quoteData = {
        account: mockAccountId,
        customer: mockCustomerId,
        totalValue: 200.0,
        validUntil: new Date('2024-12-31'),
        issuedAt: new Date('2024-01-01'),
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      const result = await service.create(quoteData);

      expect(quoteModel).toHaveBeenCalledWith(quoteData);
      expect(result).toMatchObject({
        account: mockAccountId,
        customer: mockCustomerId,
        totalValue: 200.0,
        validUntil: new Date('2024-12-31'),
        issuedAt: new Date('2024-01-01'),
        createdBy: mockUserId,
        updatedBy: mockUserId
      });
    });
  });

  describe('findByAccount', () => {
    it('should return paginated quotes without search', async () => {
      const mockAggregateResult = mockQuoteArray;

      quoteModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '', 'draft');

      expect(quoteModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        quotes: mockAggregateResult,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should return paginated quotes with search', async () => {
      const mockAggregateResult = mockQuoteArray;
      const mockCountResult = [{ total: 1 }];

      quoteModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockCountResult)
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockAggregateResult)
        });

      const result = await service.findByAccount(mockAccountId, 1, 10, 'test', '');

      expect(quoteModel.aggregate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        quotes: mockAggregateResult,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should filter by customer when provided', async () => {
      const mockAggregateResult = mockQuoteArray;

      quoteModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '', '', mockCustomerId.toString());

      expect(quoteModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        quotes: mockAggregateResult,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should handle pagination correctly', async () => {
      const mockAggregateResult = mockQuoteArray;

      quoteModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findByAccount(mockAccountId, 2, 5, '', '');

      expect(result).toEqual({
        quotes: mockAggregateResult,
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1
      });
    });
  });

  describe('deleteByAccount', () => {
    it('should delete a quote successfully', async () => {
      quoteModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockQuote)
      });

      const result = await service.deleteByAccount(mockQuote._id.toString(), mockAccountId);

      expect(quoteModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockQuote._id.toString(),
        account: mockAccountId
      });
      expect(result).toEqual(mockQuote);
    });

    it('should return null when quote not found', async () => {
      quoteModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.deleteByAccount('invalid-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteAllByAccount', () => {
    it('should delete all quotes for an account', async () => {
      const mockDeleteResult = { deletedCount: 5 };
      quoteModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDeleteResult)
      });

      const result = await service.deleteAllByAccount(mockAccountId);

      expect(quoteModel.deleteMany).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual(mockDeleteResult);
    });
  });

  describe('sendQuote', () => {
    it('should send a quote successfully', async () => {
      const mockPopulatedQuote = {
        ...mockQuote,
        account: { name: 'Test Account' },
        customer: { name: 'Test Customer', email: 'test@example.com' },
        services: [{ service: { name: 'Test Service' }, quantity: 1, unitValue: 100 }],
        products: [{ product: { name: 'Test Product', maker: 'Test Maker', model: 'Test Model' }, quantity: 2, unitValue: 50 }]
      };

      quoteModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedQuote)
      });

      emailService.sendEmail.mockResolvedValue(undefined);

      const result = await service.sendQuote(mockQuote._id.toString(), mockAccountId, mockUserId);

      expect(quoteModel.findOne).toHaveBeenCalledWith({
        _id: mockQuote._id.toString(),
        account: mockAccountId
      });
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(quoteModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockQuote._id.toString(), account: mockAccountId },
        expect.objectContaining({
          status: 'sent',
          updatedBy: mockUserId,
          approvalToken: expect.any(String),
          approvalTokenExpires: expect.any(Date)
        }),
        { new: true }
      );
      expect(result).toEqual({ success: true, message: 'Quote sent successfully' });
    });

    it('should throw error when quote not found', async () => {
      quoteModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.sendQuote('invalid-id', mockAccountId, mockUserId)).rejects.toThrow('quotes.errors.quoteNotFound');
    });

    it('should throw error when customer email not found', async () => {
      const mockPopulatedQuote = {
        ...mockQuote,
        account: { name: 'Test Account' },
        customer: { name: 'Test Customer' } // No email
      };

      quoteModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedQuote)
      });

      await expect(service.sendQuote(mockQuote._id.toString(), mockAccountId, mockUserId)).rejects.toThrow('quotes.errors.customerEmailNotFound');
    });
  });
});
