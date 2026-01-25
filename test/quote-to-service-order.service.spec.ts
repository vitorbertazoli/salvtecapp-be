import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { QuoteToServiceOrderService } from '../src/quote-to-service-order/quote-to-service-order.service';
import { Quote } from '../src/quotes/schemas/quote.schema';
import { ServiceOrder } from '../src/service-orders/schemas/service-order.schema';

describe('QuoteToServiceOrderService', () => {
  let service: QuoteToServiceOrderService;
  let quoteModel: any;
  let serviceOrderModel: any;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockServiceId = new Types.ObjectId();
  const mockProductId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockQuoteId = new Types.ObjectId();

  const mockQuote = {
    _id: mockQuoteId,
    account: mockAccountId,
    customer: mockCustomerId,
    equipments: [
      {
        name: 'AC Unit',
        room: 'Living Room',
        btus: 12000,
        service: mockServiceId,
        product: mockProductId,
        quantity: 1,
        unitPrice: 100.0,
        totalPrice: 100.0
      }
    ],
    services: [
      {
        service: mockServiceId,
        product: mockProductId,
        quantity: 1,
        unitPrice: 100.0,
        totalPrice: 100.0
      }
    ],
    products: [
      {
        product: mockProductId,
        quantity: 1,
        unitPrice: 100.0,
        totalPrice: 100.0
      }
    ],
    description: 'Test quote',
    totalValue: 200.0,
    status: 'draft' as const,
    validUntil: new Date('2024-12-31'),
    issuedAt: new Date('2024-01-01'),
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockServiceOrder = {
    _id: new Types.ObjectId(),
    orderNumber: 'SO-001',
    quote: mockQuoteId,
    customer: mockCustomerId,
    account: mockAccountId,
    equipments: mockQuote.equipments,
    items: [
      {
        type: 'service' as const,
        itemId: mockServiceId,
        name: 'Test Service',
        quantity: 1,
        unitValue: 100.0,
        totalValue: 100.0
      }
    ],
    description: 'Test service order',
    subtotal: 100.0,
    totalValue: 100.0,
    issuedAt: new Date(),
    status: 'pending' as const,
    priority: 'normal' as const,
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

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
    mockQuoteModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });
    mockQuoteModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });

    const mockServiceOrderModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockServiceOrder,
        ...data,
        toObject: jest.fn().mockReturnValue({
          ...mockServiceOrder,
          ...data
        })
      })
    }));

    // Add static methods
    mockServiceOrderModel.create = jest.fn().mockReturnValue({
      save: jest.fn().mockResolvedValue({
        ...mockServiceOrder,
        toObject: jest.fn().mockReturnValue(mockServiceOrder)
      })
    });
    mockServiceOrderModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null)
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteToServiceOrderService,
        {
          provide: getModelToken(Quote.name),
          useValue: mockQuoteModel
        },
        {
          provide: getModelToken(ServiceOrder.name),
          useValue: mockServiceOrderModel
        }
      ]
    }).compile();

    service = module.get<QuoteToServiceOrderService>(QuoteToServiceOrderService);
    quoteModel = module.get(getModelToken(Quote.name));
    serviceOrderModel = module.get(getModelToken(ServiceOrder.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
        totalValue: 250.0,
        updatedBy: mockUserId
      };

      const expectedUpdateData = {
        ...updateData,
        status: 'draft'
      };

      quoteModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockQuote, status: 'sent' })
      });

      quoteModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockQuote,
          ...expectedUpdateData
        })
      });

      const result = await service.updateByAccount(mockQuote._id.toString(), updateData, mockAccountId, mockUserId);

      expect(quoteModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockQuote._id.toString(), account: mockAccountId }, expectedUpdateData, { new: true });
      expect(result.status).toBe('draft');
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
    });

    it('should return null when quote not found', async () => {
      const updateData = {
        description: 'Updated description',
        updatedBy: mockUserId
      };

      quoteModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.updateByAccount(mockQuote._id.toString(), updateData, mockAccountId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('createFromQuote', () => {
    it('should create a service order from quote successfully', async () => {
      // Mock the findByIdAndAccount method
      jest.spyOn(service, 'findByIdAndAccount').mockResolvedValue(mockQuote as any);

      // Mock the updateByAccount method
      jest.spyOn(service, 'updateByAccount').mockResolvedValue(mockQuote as any);

      const result = await service.createFromQuote(mockQuoteId.toString(), 'normal', mockAccountId, mockUserId);

      expect(service.findByIdAndAccount).toHaveBeenCalledWith(mockQuoteId.toString(), mockAccountId);
      expect(serviceOrderModel).toHaveBeenCalledWith(
        expect.objectContaining({
          quote: mockQuoteId,
          account: mockAccountId,
          customer: mockCustomerId,
          status: 'pending',
          priority: 'normal',
          createdBy: mockUserId,
          updatedBy: mockUserId
        })
      );
      expect(service.updateByAccount).toHaveBeenCalledWith(mockQuoteId.toString(), { status: 'accepted' }, mockAccountId);
      expect(result).toEqual(
        expect.objectContaining({
          quote: mockQuoteId,
          account: mockAccountId,
          customer: mockCustomerId,
          status: 'pending',
          priority: 'normal'
        })
      );
    });

    it('should throw error when quote not found', async () => {
      jest.spyOn(service, 'findByIdAndAccount').mockResolvedValue(null);

      await expect(service.createFromQuote(mockQuoteId.toString(), 'normal', mockAccountId, mockUserId)).rejects.toThrow('quotes.errors.quoteNotFound');
    });
  });
});
