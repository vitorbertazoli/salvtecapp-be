import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServicesService } from '../src/services/services.service';
import { Service, ServiceDocument } from '../src/services/schemas/service.schema';

describe('ServicesService', () => {
  let service: ServicesService;
  let serviceModel: any;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = 'user123';

  const mockService = {
    _id: new Types.ObjectId(),
    name: 'Test Service',
    description: 'A test service',
    value: 150.00,
    account: mockAccountId,
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockServiceArray = [mockService];

  beforeEach(async () => {
    const mockServiceModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...data,
        _id: new Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          ...data,
          _id: new Types.ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }),
      populate: jest.fn().mockReturnThis(),
    }));

    // Add static methods
    mockServiceModel.find = jest.fn();
    mockServiceModel.findOne = jest.fn();
    mockServiceModel.findOneAndUpdate = jest.fn();
    mockServiceModel.findOneAndDelete = jest.fn();
    mockServiceModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockServiceModel.deleteMany = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: getModelToken(Service.name),
          useValue: mockServiceModel,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    serviceModel = module.get(getModelToken(Service.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a service', async () => {
      const serviceData = {
        name: 'New Service',
        description: 'New service description',
        value: 200.00,
        account: mockAccountId,
        createdBy: mockUserId,
        updatedBy: mockUserId,
      };

      const mockCreatedService = {
        ...serviceData,
        _id: new Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      serviceModel.mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(mockCreatedService),
      }));

      const result = await service.create(serviceData);

      expect(serviceModel).toHaveBeenCalledWith(serviceData);
      expect(result).toEqual(mockCreatedService);
    });
  });

  describe('findOne', () => {
    it('should return a service by id and account', async () => {
      const mockQuery = { _id: mockService._id.toString(), account: mockAccountId };
      const mockPopulatedService = { ...mockService, account: { name: 'Test Account' } };

      serviceModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPopulatedService),
        }),
      });

      const result = await service.findOne(mockService._id.toString(), mockAccountId);

      expect(serviceModel.findOne).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockPopulatedService);
    });

    it('should return a service by id without account filter', async () => {
      const mockQuery = { _id: mockService._id.toString() };
      const mockPopulatedService = { ...mockService, account: { name: 'Test Account' } };

      serviceModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPopulatedService),
        }),
      });

      const result = await service.findOne(mockService._id.toString());

      expect(serviceModel.findOne).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual(mockPopulatedService);
    });

    it('should return null when service not found', async () => {
      serviceModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.findOne('nonexistent-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('findByAccount', () => {
    it('should return paginated services without search', async () => {
      const mockResult = {
        services: mockServiceArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      serviceModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockServiceArray),
              }),
            }),
          }),
        }),
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '');

      expect(serviceModel.find).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual(mockResult);
    });

    it('should return paginated services with search', async () => {
      const searchTerm = 'test';
      const mockResult = {
        services: mockServiceArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      const expectedQuery = {
        account: mockAccountId,
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      };

      serviceModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockServiceArray),
              }),
            }),
          }),
        }),
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, searchTerm);

      expect(serviceModel.find).toHaveBeenCalledWith(expectedQuery);
      expect(result).toEqual(mockResult);
    });

    it('should handle pagination correctly', async () => {
      const mockResult = {
        services: mockServiceArray,
        total: 1,
        page: 2,
        limit: 20,
        totalPages: 1,
      };

      serviceModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockServiceArray),
              }),
            }),
          }),
        }),
      });

      const result = await service.findByAccount(mockAccountId, 2, 20, '');

      expect(serviceModel.find).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    it('should update a service successfully', async () => {
      const updateData = {
        name: 'Updated Service',
        value: 250.00,
        updatedBy: mockUserId,
      };

      const mockUpdatedService = {
        ...mockService,
        ...updateData,
        account: { name: 'Test Account' },
      };

      serviceModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUpdatedService),
        }),
      });

      const result = await service.update(mockService._id.toString(), updateData, mockAccountId);

      expect(serviceModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockService._id.toString(), account: mockAccountId },
        updateData,
        { new: true }
      );
      expect(result).toEqual(mockUpdatedService);
    });

    it('should return null when service not found', async () => {
      const updateData = { name: 'Updated Service' };

      serviceModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.update('nonexistent-id', updateData, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a service by id and account', async () => {
      serviceModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockService),
      });

      const result = await service.delete(mockService._id.toString(), mockAccountId);

      expect(serviceModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockService._id.toString(),
        account: mockAccountId,
      });
      expect(result).toEqual(mockService);
    });

    it('should delete a service by id without account filter', async () => {
      serviceModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockService),
      });

      const result = await service.delete(mockService._id.toString());

      expect(serviceModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockService._id.toString(),
      });
      expect(result).toEqual(mockService);
    });

    it('should return null when service not found', async () => {
      serviceModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.delete('nonexistent-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteAllByAccount', () => {
    it('should delete all services for an account', async () => {
      const mockDeleteResult = { deletedCount: 5 };
      serviceModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDeleteResult),
      });

      const result = await service.deleteAllByAccount(mockAccountId);

      expect(serviceModel.deleteMany).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual(mockDeleteResult);
    });
  });
});