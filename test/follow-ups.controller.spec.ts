import { Test, TestingModule } from '@nestjs/testing';
import { FollowUpsController } from '../src/follow-ups/follow-ups.controller';
import { FollowUpsService } from '../src/follow-ups/follow-ups.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Types } from 'mongoose';

describe('FollowUpsController', () => {
  let controller: FollowUpsController;
  let service: FollowUpsService;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

  const mockFollowUp = {
    _id: new Types.ObjectId(),
    customer: mockCustomerId,
    account: mockAccountId,
    startDate: new Date('2024-01-15'),
    status: 'pending',
    notes: ['Initial note'],
    createdBy: mockUserId,
    updatedBy: mockUserId
  };

  const mockFollowUpArray = [mockFollowUp];

  const mockPaginatedResult = {
    followUps: mockFollowUpArray,
    total: 1,
    page: 1,
    limit: 50,
    totalPages: 1
  };

  const mockFollowUpsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByAccount: jest.fn(),
    findByIdAndAccount: jest.fn(),
    updateByAccount: jest.fn(),
    deleteByAccount: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowUpsController],
      providers: [
        {
          provide: FollowUpsService,
          useValue: mockFollowUpsService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<FollowUpsController>(FollowUpsController);
    service = module.get<FollowUpsService>(FollowUpsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a follow-up', async () => {
      const createFollowUpDto = {
        customer: mockCustomerId.toString(),
        startDate: '2024-01-15T00:00:00.000Z',
        status: 'pending' as const,
        notes: ['Initial note']
      };

      const expectedFollowUpData = {
        ...createFollowUpDto,
        account: mockAccountId,
        customer: new Types.ObjectId(createFollowUpDto.customer),
        createdBy: new Types.ObjectId(mockUserId.toString()),
        updatedBy: new Types.ObjectId(mockUserId.toString())
      };

      mockFollowUpsService.create.mockResolvedValue(mockFollowUp);

      const result = await controller.create(createFollowUpDto, mockAccountId, mockUserId.toString());

      expect(service.create).toHaveBeenCalledWith(expectedFollowUpData);
      expect(result).toEqual(mockFollowUp);
    });

    it('should create a follow-up with minimal data', async () => {
      const createFollowUpDto = {
        customer: mockCustomerId.toString(),
        startDate: '2024-01-15T00:00:00.000Z'
      };

      const expectedFollowUpData = {
        ...createFollowUpDto,
        account: mockAccountId,
        customer: new Types.ObjectId(createFollowUpDto.customer),
        createdBy: new Types.ObjectId(mockUserId.toString()),
        updatedBy: new Types.ObjectId(mockUserId.toString())
      };

      mockFollowUpsService.create.mockResolvedValue(mockFollowUp);

      const result = await controller.create(createFollowUpDto, mockAccountId, mockUserId.toString());

      expect(service.create).toHaveBeenCalledWith(expectedFollowUpData);
      expect(result).toEqual(mockFollowUp);
    });
  });

  describe('findAll', () => {
    it('should return paginated follow-ups with all filters', async () => {
      mockFollowUpsService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('1', '50', 'search term', 'pending', mockCustomerId.toString(), '2024-01-01', '2024-01-31', mockAccountId);

      expect(service.findByAccount).toHaveBeenCalledWith(
        mockAccountId,
        1,
        50,
        'search term',
        'pending',
        mockCustomerId.toString(),
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should return paginated follow-ups with default values', async () => {
      mockFollowUpsService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll(undefined, undefined, undefined, undefined, undefined, undefined, undefined, mockAccountId);

      expect(service.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 50, '', undefined, undefined, undefined, undefined);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should handle empty string parameters as undefined', async () => {
      mockFollowUpsService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('1', '10', '', '', '', '', '', mockAccountId);

      expect(service.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined, undefined, undefined, undefined);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single follow-up', async () => {
      const followUpId = mockFollowUp._id.toString();

      mockFollowUpsService.findByIdAndAccount.mockResolvedValue(mockFollowUp);

      const result = await controller.findOne(followUpId, mockAccountId);

      expect(service.findByIdAndAccount).toHaveBeenCalledWith(followUpId, mockAccountId);
      expect(result).toEqual(mockFollowUp);
    });

    it('should return null when follow-up not found', async () => {
      const followUpId = 'nonexistent-id';

      mockFollowUpsService.findByIdAndAccount.mockResolvedValue(null);

      const result = await controller.findOne(followUpId, mockAccountId);

      expect(service.findByIdAndAccount).toHaveBeenCalledWith(followUpId, mockAccountId);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a follow-up with status completed', async () => {
      const followUpId = mockFollowUp._id.toString();
      const updateFollowUpDto = {
        status: 'completed' as const,
        notes: ['Updated note']
      };

      const expectedFollowUpData = {
        ...updateFollowUpDto,
        updatedBy: new Types.ObjectId(mockUserId.toString()),
        completedAt: expect.any(Date),
        completedBy: new Types.ObjectId(mockUserId.toString())
      };

      mockFollowUpsService.updateByAccount.mockResolvedValue(mockFollowUp);

      const result = await controller.update(followUpId, updateFollowUpDto, mockUserId.toString(), mockAccountId);

      expect(service.updateByAccount).toHaveBeenCalledWith(followUpId, expectedFollowUpData, mockAccountId);
      expect(result).toEqual(mockFollowUp);
    });

    it('should update a follow-up with status pending', async () => {
      const followUpId = mockFollowUp._id.toString();
      const updateFollowUpDto = {
        status: 'pending' as const,
        notes: ['Updated note']
      };

      const expectedFollowUpData = {
        ...updateFollowUpDto,
        updatedBy: new Types.ObjectId(mockUserId.toString()),
        completedAt: undefined,
        completedBy: undefined
      };

      mockFollowUpsService.updateByAccount.mockResolvedValue(mockFollowUp);

      const result = await controller.update(followUpId, updateFollowUpDto, mockUserId.toString(), mockAccountId);

      expect(service.updateByAccount).toHaveBeenCalledWith(followUpId, expectedFollowUpData, mockAccountId);
      expect(result).toEqual(mockFollowUp);
    });

    it('should update a follow-up without status change', async () => {
      const followUpId = mockFollowUp._id.toString();
      const updateFollowUpDto = {
        notes: ['Updated note']
      };

      const expectedFollowUpData = {
        ...updateFollowUpDto,
        updatedBy: new Types.ObjectId(mockUserId.toString())
      };

      mockFollowUpsService.updateByAccount.mockResolvedValue(mockFollowUp);

      const result = await controller.update(followUpId, updateFollowUpDto, mockUserId.toString(), mockAccountId);

      expect(service.updateByAccount).toHaveBeenCalledWith(followUpId, expectedFollowUpData, mockAccountId);
      expect(result).toEqual(mockFollowUp);
    });

    it('should return null when follow-up not found', async () => {
      const followUpId = 'nonexistent-id';
      const updateFollowUpDto = {
        status: 'completed' as const
      };

      mockFollowUpsService.updateByAccount.mockResolvedValue(null);

      const result = await controller.update(followUpId, updateFollowUpDto, mockUserId.toString(), mockAccountId);

      expect(service.updateByAccount).toHaveBeenCalledWith(
        followUpId,
        expect.objectContaining({
          status: 'completed',
          updatedBy: new Types.ObjectId(mockUserId.toString()),
          completedAt: expect.any(Date),
          completedBy: new Types.ObjectId(mockUserId.toString())
        }),
        mockAccountId
      );
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a follow-up', async () => {
      const followUpId = mockFollowUp._id.toString();

      mockFollowUpsService.deleteByAccount.mockResolvedValue(mockFollowUp);

      const result = await controller.delete(followUpId, mockAccountId);

      expect(service.deleteByAccount).toHaveBeenCalledWith(followUpId, mockAccountId);
      expect(result).toEqual(mockFollowUp);
    });

    it('should return null when follow-up not found', async () => {
      const followUpId = 'nonexistent-id';

      mockFollowUpsService.deleteByAccount.mockResolvedValue(null);

      const result = await controller.delete(followUpId, mockAccountId);

      expect(service.deleteByAccount).toHaveBeenCalledWith(followUpId, mockAccountId);
      expect(result).toBeNull();
    });
  });
});
