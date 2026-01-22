import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { QuotesService } from '../src/quotes/quotes.service';
import { Quote } from '../src/quotes/schemas/quote.schema';
import { ServiceOrdersService } from '../src/service-orders/service-orders.service';
import { EmailService } from '../src/utils/email.service';

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

    const mockServiceOrdersService = {
      createFromQuote: jest.fn()
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
          provide: ServiceOrdersService,
          useValue: mockServiceOrdersService
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

  describe('findByIdAndAccount', () => {
    it('should return a quote by id and account', async () => {
      quoteModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockQuote)
      });

      const result = await service.findByIdAndAccount(mockQuote._id.toString(), mockAccountId);

      expect(quoteModel.findOne).toHaveBeenCalledWith({
        _id: mockQuote._id.toString(),
        account: mockAccountId
      });
      expect(result).toEqual(mockQuote);
    });

    it('should return null when quote not found', async () => {
      quoteModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.findByIdAndAccount('invalid-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('updateByAccount', () => {
    it('should update a quote successfully', async () => {
      const updateData = {
        description: 'Updated description',
        totalValue: 250.0,
        updatedBy: mockUserId
      };

      quoteModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockQuote, status: 'draft' })
      });

      quoteModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockQuote,
          ...updateData
        })
      });

      const result = await service.updateByAccount(mockQuote._id.toString(), updateData, mockAccountId, mockUserId);

      expect(quoteModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockQuote._id.toString(), account: mockAccountId }, updateData, { new: true });
      expect(result).toMatchObject({
        ...mockQuote,
        ...updateData
      });
    });

    it('should reset status to draft when updating sent quote', async () => {
      const updateData = {
        description: 'Updated description',
        updatedBy: mockUserId
      };

      quoteModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockQuote, status: 'sent' })
      });

      quoteModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockQuote,
          ...updateData,
          status: 'draft'
        })
      });

      const result = await service.updateByAccount(mockQuote._id.toString(), updateData, mockAccountId, mockUserId);

      expect(quoteModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockQuote._id.toString(), account: mockAccountId },
        { ...updateData, status: 'draft' },
        { new: true }
      );
      expect(result).toMatchObject({
        ...mockQuote,
        ...updateData,
        status: 'draft'
      });
    });

    it('should throw BadRequestException when trying to update accepted quote', async () => {
      const updateData = {
        description: 'Updated description',
        updatedBy: mockUserId
      };

      quoteModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockQuote, status: 'accepted' })
      });

      await expect(service.updateByAccount(mockQuote._id.toString(), updateData, mockAccountId, mockUserId)).rejects.toThrow(BadRequestException);
      await expect(service.updateByAccount(mockQuote._id.toString(), updateData, mockAccountId, mockUserId)).rejects.toThrow(
        'Quote has been accepted and cannot be modified. Use change order process.'
      );
    });

    it('should return null when quote not found', async () => {
      quoteModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.updateByAccount('invalid-id', { description: 'Updated' }, mockAccountId, mockUserId);

      expect(result).toBeNull();
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
        { status: 'sent', updatedBy: mockUserId },
        { new: true }
      );
      expect(result).toEqual({ success: true, message: 'Quote sent successfully' });
    });

    it('should throw error when quote not found', async () => {
      quoteModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.sendQuote('invalid-id', mockAccountId, mockUserId)).rejects.toThrow('Quote not found');
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

      await expect(service.sendQuote(mockQuote._id.toString(), mockAccountId, mockUserId)).rejects.toThrow('Customer email not found');
    });
  });
});
