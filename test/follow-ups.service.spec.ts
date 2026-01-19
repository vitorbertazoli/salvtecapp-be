import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowUpsService } from '../src/follow-ups/follow-ups.service';
import { FollowUp, FollowUpDocument } from '../src/follow-ups/schemas/follow-up.schema';
import { CustomersService } from '../src/customers/customers.service';

describe('FollowUpsService', () => {
  let service: FollowUpsService;
  let followUpModel: any;
  let customersService: any;

  const mockAccountId = new Types.ObjectId();
  const mockCustomerId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

  const mockCustomer = {
    _id: mockCustomerId,
    name: 'John Doe',
    email: 'john@example.com',
  };

  const mockFollowUp = {
    _id: new Types.ObjectId(),
    customer: mockCustomerId,
    account: mockAccountId,
    startDate: new Date('2024-01-15'),
    status: 'pending',
    notes: ['Initial note'],
    createdBy: mockUserId,
    updatedBy: mockUserId,
  };

  const mockFollowUpArray = [mockFollowUp];

  beforeEach(async () => {
    const mockFollowUpModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockFollowUp,
        toObject: jest.fn().mockReturnValue(mockFollowUp),
      }),
      populate: jest.fn().mockReturnThis(),
    }));

    // Add static methods
    mockFollowUpModel.find = jest.fn();
    mockFollowUpModel.findOne = jest.fn();
    mockFollowUpModel.findOneAndUpdate = jest.fn();
    mockFollowUpModel.findOneAndDelete = jest.fn();
    mockFollowUpModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockFollowUpModel.deleteMany = jest.fn();
    mockFollowUpModel.aggregate = jest.fn();

    const mockCustomersService = {
      findByIdAndAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpsService,
        {
          provide: getModelToken(FollowUp.name),
          useValue: mockFollowUpModel,
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
      ],
    }).compile();

    service = module.get<FollowUpsService>(FollowUpsService);
    followUpModel = module.get(getModelToken(FollowUp.name));
    customersService = module.get(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a follow-up successfully', async () => {
      const followUpData = {
        customer: mockCustomerId.toString(),
        account: mockAccountId,
        startDate: new Date('2024-01-15'),
        notes: ['Initial note'],
        createdBy: mockUserId,
        updatedBy: mockUserId,
      };

      customersService.findByIdAndAccount.mockResolvedValue(mockCustomer);

      const result = await service.create(followUpData);

      expect(customersService.findByIdAndAccount).toHaveBeenCalledWith(mockCustomerId.toString(), mockAccountId);
      expect(result).toEqual(mockFollowUp);
    });

    it('should throw NotFoundException when customer not found', async () => {
      const followUpData = {
        customer: mockCustomerId.toString(),
        account: mockAccountId,
        startDate: new Date('2024-01-15'),
        createdBy: mockUserId,
        updatedBy: mockUserId,
      };

      customersService.findByIdAndAccount.mockResolvedValue(null);

      await expect(service.create(followUpData)).rejects.toThrow('Customer not found');
    });

    it('should handle string notes by converting to array', async () => {
      const followUpData = {
        customer: mockCustomerId.toString(),
        account: mockAccountId,
        startDate: new Date('2024-01-15'),
        notes: 'Single note' as any,
        createdBy: mockUserId,
        updatedBy: mockUserId,
      };

      customersService.findByIdAndAccount.mockResolvedValue(mockCustomer);

      await service.create(followUpData);

      // The notes should be converted to array in the mock
      expect(followUpModel).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: ['Single note'],
        })
      );
    });

    it('should handle non-array notes by setting to empty array', async () => {
      const followUpData = {
        customer: mockCustomerId.toString(),
        account: mockAccountId,
        startDate: new Date('2024-01-15'),
        notes: 123 as any,
        createdBy: mockUserId,
        updatedBy: mockUserId,
      };

      customersService.findByIdAndAccount.mockResolvedValue(mockCustomer);

      await service.create(followUpData);

      expect(followUpModel).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: [],
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return all follow-ups', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockFollowUpArray),
      };

      followUpModel.find.mockReturnValue(mockQuery);

      const result = await service.findAll();

      expect(followUpModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockFollowUpArray);
    });
  });

  describe('findByAccount', () => {
    it('should return paginated follow-ups for account', async () => {
      const mockAggregateResult = [mockFollowUp];
      const mockCountResult = [{ total: 1 }];

      followUpModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockAggregateResult),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockCountResult),
        });

      const result = await service.findByAccount(mockAccountId, 1, 10, 'search', 'pending', mockCustomerId.toString(), new Date('2024-01-01'), new Date('2024-01-31'));

      expect(followUpModel.aggregate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        followUps: mockAggregateResult,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should return paginated follow-ups without search', async () => {
      const mockAggregateResult = [mockFollowUp];

      followUpModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult),
      });
      followUpModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '', 'pending');

      expect(followUpModel.countDocuments).toHaveBeenCalledWith({
        account: mockAccountId,
        status: 'pending',
      });
      expect(result).toEqual({
        followUps: mockAggregateResult,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by customer when provided', async () => {
      const mockAggregateResult = [mockFollowUp];

      followUpModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult),
      });
      followUpModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '', undefined, mockCustomerId.toString());

      expect(followUpModel.countDocuments).toHaveBeenCalledWith({
        account: mockAccountId,
        customer: mockCustomerId,
      });
      expect(result.followUps).toEqual(mockAggregateResult);
    });

    it('should filter by date range when provided', async () => {
      const mockAggregateResult = [mockFollowUp];

      followUpModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult),
      });
      followUpModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.findByAccount(mockAccountId, 1, 10, '', undefined, undefined, startDate, endDate);

      expect(followUpModel.countDocuments).toHaveBeenCalledWith({
        account: mockAccountId,
        startDate: {
          $gte: startDate,
          $lte: endDate,
        },
      });
      expect(result.followUps).toEqual(mockAggregateResult);
    });
  });

  describe('findByIdAndAccount', () => {
    it('should return follow-up by id and account', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFollowUp),
      };

      followUpModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findByIdAndAccount(mockFollowUp._id.toString(), mockAccountId);

      expect(followUpModel.findOne).toHaveBeenCalledWith({
        _id: mockFollowUp._id.toString(),
        account: mockAccountId,
      });
      expect(result).toEqual(mockFollowUp);
    });

    it('should return null when follow-up not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      followUpModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findByIdAndAccount('nonexistent-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('updateByAccount', () => {
    it('should update follow-up successfully', async () => {
      const updateData = {
        status: 'completed',
        updatedBy: mockUserId,
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockFollowUp),
      };

      followUpModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const result = await service.updateByAccount(mockFollowUp._id.toString(), updateData, mockAccountId);

      expect(followUpModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockFollowUp._id.toString(), account: mockAccountId },
        updateData,
        { new: true }
      );
      expect(result).toEqual(mockFollowUp);
    });

    it('should append notes to existing notes array', async () => {
      const updateData = {
        notes: ['New note'],
        updatedBy: mockUserId,
      };

      const existingFollowUp = {
        ...mockFollowUp,
        notes: ['Existing note'],
      };

      const mockExistingQuery = {
        exec: jest.fn().mockResolvedValue(existingFollowUp),
      };

      const mockUpdateQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...existingFollowUp,
          notes: ['Existing note', 'New note'],
        }),
      };

      followUpModel.findOne.mockReturnValue(mockExistingQuery);
      followUpModel.findOneAndUpdate.mockReturnValue(mockUpdateQuery);

      const result = await service.updateByAccount(mockFollowUp._id.toString(), updateData, mockAccountId);

      expect(followUpModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockFollowUp._id.toString(), account: mockAccountId },
        {
          ...updateData,
          notes: ['Existing note', 'New note'],
        },
        { new: true }
      );
      expect(result.notes).toEqual(['Existing note', 'New note']);
    });

    it('should return null when follow-up not found', async () => {
      const updateData = {
        status: 'completed',
        updatedBy: mockUserId,
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      followUpModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const result = await service.updateByAccount('nonexistent-id', updateData, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteByAccount', () => {
    it('should delete follow-up successfully', async () => {
      followUpModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFollowUp),
      });

      const result = await service.deleteByAccount(mockFollowUp._id.toString(), mockAccountId);

      expect(followUpModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockFollowUp._id.toString(),
        account: mockAccountId,
      });
      expect(result).toEqual(mockFollowUp);
    });

    it('should return null when follow-up not found', async () => {
      followUpModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.deleteByAccount('nonexistent-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteAllByAccount', () => {
    it('should delete all follow-ups for account', async () => {
      const deleteResult = { deletedCount: 5 };
      followUpModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue(deleteResult),
      });

      const result = await service.deleteAllByAccount(mockAccountId);

      expect(followUpModel.deleteMany).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual(deleteResult);
    });
  });
});