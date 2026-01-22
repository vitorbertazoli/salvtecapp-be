import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PublicQuotesController } from '../src/quotes/public-quotes.controller';
import { QuotesService } from '../src/quotes/quotes.service';

describe('PublicQuotesController', () => {
  let controller: PublicQuotesController;
  let service: QuotesService;

  const mockQuote = {
    _id: 'quote-id',
    description: 'Test Quote Description',
    status: 'sent',
    approvalToken: 'test-token',
    approvalTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    customer: {
      name: 'Test Customer',
      email: 'customer@test.com'
    },
    account: {
      name: 'Test Account'
    },
    services: [],
    products: [],
    equipments: [],
    totalValue: 1000,
    discount: 10,
    otherDiscounts: [],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    issuedAt: new Date(),
    createdAt: new Date(),
    createdBy: 'user-id',
    updatedBy: 'user-id'
  };

  const mockQuotesService = {
    getQuoteByToken: jest.fn(),
    approveQuoteByToken: jest.fn()
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      return undefined;
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicQuotesController],
      providers: [
        {
          provide: QuotesService,
          useValue: mockQuotesService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    }).compile();

    controller = module.get<PublicQuotesController>(PublicQuotesController);
    service = module.get<QuotesService>(QuotesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getQuoteForApproval', () => {
    it('should return quote data for valid token', async () => {
      mockQuotesService.getQuoteByToken.mockResolvedValue(mockQuote);

      const result = await controller.getQuoteForApproval('valid-token');

      expect(result).toEqual({
        id: mockQuote._id,
        description: mockQuote.description,
        customer: mockQuote.customer,
        account: mockQuote.account,
        services: mockQuote.services,
        products: mockQuote.products,
        equipments: mockQuote.equipments,
        totalValue: mockQuote.totalValue,
        discount: mockQuote.discount,
        otherDiscounts: mockQuote.otherDiscounts,
        status: mockQuote.status,
        validUntil: mockQuote.validUntil,
        issuedAt: mockQuote.issuedAt,
        createdAt: mockQuote.createdAt,
        createdBy: mockQuote.createdBy
      });
      expect(mockQuotesService.getQuoteByToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw NotFoundException for invalid token', async () => {
      mockQuotesService.getQuoteByToken.mockResolvedValue(null);

      await expect(controller.getQuoteForApproval('invalid-token')).rejects.toThrow('Quote not found or token expired');
    });
  });

  describe('approveQuote', () => {
    it('should approve quote successfully', async () => {
      const approvalData = { approved: true, notes: 'Looks good!' };
      const serviceResponse = {
        success: true,
        message: 'Quote approved successfully',
        quote: { ...mockQuote, status: 'accepted' }
      };
      mockQuotesService.approveQuoteByToken.mockResolvedValue(serviceResponse);

      const result = await controller.approveQuote('valid-token', approvalData);

      expect(result).toEqual(serviceResponse);
      expect(mockQuotesService.approveQuoteByToken).toHaveBeenCalledWith('valid-token', approvalData);
    });

    it('should reject quote successfully', async () => {
      const approvalData = { approved: false, notes: 'Need changes' };
      const serviceResponse = {
        success: true,
        message: 'Quote rejected',
        quote: { ...mockQuote, status: 'rejected' }
      };
      mockQuotesService.approveQuoteByToken.mockResolvedValue(serviceResponse);

      const result = await controller.approveQuote('valid-token', approvalData);

      expect(result).toEqual(serviceResponse);
      expect(mockQuotesService.approveQuoteByToken).toHaveBeenCalledWith('valid-token', approvalData);
    });

    it('should throw NotFoundException for invalid token', async () => {
      const approvalData = { approved: true };
      mockQuotesService.approveQuoteByToken.mockResolvedValue(null);

      await expect(controller.approveQuote('invalid-token', approvalData)).rejects.toThrow('Quote not found or token expired');
    });
  });
});
