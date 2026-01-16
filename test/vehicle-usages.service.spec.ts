import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ForbiddenException } from '@nestjs/common';
import { VehicleUsagesService } from '../src/vehicle-usages/vehicle-usages.service';
import { VehicleUsage, VehicleUsageDocument } from '../src/vehicle-usages/schemas/vehicle-usages.schema';

describe('VehicleUsagesService', () => {
  let service: VehicleUsagesService;
  let vehicleUsageModel: any;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockTechnicianId = new Types.ObjectId();
  const mockVehicleId = new Types.ObjectId();
  const mockUsageId = new Types.ObjectId();
  const mockCreatedBy = 'user123';
  const mockUpdatedBy = 'user456';

  const mockVehicleUsage = {
    _id: mockUsageId,
    account: mockAccountId,
    technician: mockTechnicianId,
    vehicle: mockVehicleId,
    purpose: 'Service call',
    startDate: new Date('2024-01-01T08:00:00Z'),
    endDate: new Date('2024-01-01T17:00:00Z'),
    mileageStart: 10000,
    mileageEnd: 10100,
    status: 'pending' as const,
    createdBy: mockCreatedBy,
    updatedBy: mockUpdatedBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPopulatedUsage = {
    ...mockVehicleUsage,
    technician: {
      _id: mockTechnicianId,
      user: {
        firstName: 'João',
        lastName: 'Silva',
      },
    },
    vehicle: {
      _id: mockVehicleId,
      name: 'Van 001',
      licensePlate: 'ABC-1234',
    },
    approvedBy: {
      _id: mockUserId,
      firstName: 'Admin',
      lastName: 'User',
    },
    createdBy: {
      _id: mockCreatedBy,
      firstName: 'Creator',
      lastName: 'User',
    },
  };

  beforeEach(async () => {
    const mockVehicleUsageModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockVehicleUsage,
        ...data,
        toObject: jest.fn().mockReturnValue({
          ...mockVehicleUsage,
          ...data,
        }),
      }),
      populate: jest.fn().mockReturnThis(),
    }));

    // Add static methods
    mockVehicleUsageModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([mockPopulatedUsage]),
              }),
            }),
          }),
        }),
      })),
      exec: jest.fn().mockResolvedValue([mockPopulatedUsage]),
    });
    mockVehicleUsageModel.findOne = jest.fn().mockImplementation(() => {
      const createMockQuery = () => ({
        populate: jest.fn().mockImplementation(() => createMockQuery()),
        exec: jest.fn(),
      });
      return createMockQuery();
    });
    mockVehicleUsageModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });
    mockVehicleUsageModel.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });
    mockVehicleUsageModel.findOneAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleUsagesService,
        {
          provide: getModelToken(VehicleUsage.name),
          useValue: mockVehicleUsageModel,
        },
      ],
    }).compile();

    service = module.get<VehicleUsagesService>(VehicleUsagesService);
    vehicleUsageModel = module.get(getModelToken(VehicleUsage.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new vehicle usage successfully', async () => {
      const createData = {
        account: mockAccountId,
        technician: mockTechnicianId,
        vehicle: mockVehicleId,
        purpose: 'Service call',
        startDate: new Date('2024-01-01T08:00:00Z'),
        endDate: new Date('2024-01-01T17:00:00Z'),
        mileageStart: 10000,
        mileageEnd: 10100,
        createdBy: mockCreatedBy,
        updatedBy: mockUpdatedBy,
      };

      const result = await service.create(createData);

      expect(vehicleUsageModel).toHaveBeenCalledWith(createData);
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all vehicle usages with populated data', async () => {
      const result = await service.findAll(mockAccountId);

      expect(vehicleUsageModel.find).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual([mockPopulatedUsage]);
    });

    it('should return all vehicle usages without account filter when accountId not provided', async () => {
      const result = await service.findAll();

      expect(vehicleUsageModel.find).toHaveBeenCalledWith({});
      expect(result).toEqual([mockPopulatedUsage]);
    });
  });

  describe('findOne', () => {
    it('should return vehicle usage by id and account with populated data', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedUsage),
      };
      vehicleUsageModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findOne(mockUsageId.toString(), mockAccountId);

      expect(vehicleUsageModel.findOne).toHaveBeenCalledWith({
        _id: mockUsageId.toString(),
        account: mockAccountId,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith({
        path: 'technician',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('vehicle', 'name licensePlate');
      expect(mockQuery.populate).toHaveBeenCalledWith('approvedBy', 'firstName lastName');
      expect(mockQuery.populate).toHaveBeenCalledWith('createdBy', 'firstName lastName');
      expect(result).toEqual(mockPopulatedUsage);
    });
  });

  describe('update', () => {
    it('should update vehicle usage successfully', async () => {
      const mockExisting = { ...mockVehicleUsage, status: 'pending' };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockExisting),
      };
      vehicleUsageModel.findOne.mockReturnValueOnce(mockQuery);

      const mockUpdateQuery = {
        exec: jest.fn().mockResolvedValue(mockVehicleUsage),
      };
      vehicleUsageModel.findOneAndUpdate.mockReturnValue(mockUpdateQuery);

      const updateData = { purpose: 'Updated purpose' };
      const result = await service.update(mockUsageId.toString(), updateData, mockAccountId);

      expect(vehicleUsageModel.findOne).toHaveBeenCalledWith({
        _id: mockUsageId.toString(),
        account: mockAccountId,
      });
      expect(vehicleUsageModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockUsageId.toString(), account: mockAccountId },
        updateData,
        { new: true }
      );
      expect(result).toEqual(mockVehicleUsage);
    });

    it('should throw error if vehicle usage not found', async () => {
      vehicleUsageModel.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockUsageId.toString(), { purpose: 'Updated' }, mockAccountId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error if vehicle usage is already approved', async () => {
      const mockExisting = { ...mockVehicleUsage, status: 'approved' };
      vehicleUsageModel.findOne.mockResolvedValue(mockExisting);

      await expect(
        service.update(mockUsageId.toString(), { purpose: 'Updated' }, mockAccountId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approve', () => {
    it('should approve vehicle usage successfully', async () => {
      const mockExisting = { ...mockVehicleUsage, status: 'pending' };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockExisting),
      };
      vehicleUsageModel.findOne.mockReturnValueOnce(mockQuery);

      const mockUpdateQuery = {
        exec: jest.fn().mockResolvedValue({ ...mockVehicleUsage, status: 'approved' }),
      };
      vehicleUsageModel.findByIdAndUpdate.mockReturnValue(mockUpdateQuery);

      const result = await service.approve(mockUsageId.toString(), mockUserId.toString(), mockAccountId);

      expect(vehicleUsageModel.findOne).toHaveBeenCalledWith({
        _id: mockUsageId.toString(),
        account: mockAccountId,
      });
      expect(vehicleUsageModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUsageId.toString(),
        {
          status: 'approved',
          approvedBy: mockUserId.toString(),
          approvedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(result).toEqual({ ...mockVehicleUsage, status: 'approved' });
    });

    it('should throw error if vehicle usage not found', async () => {
      vehicleUsageModel.findOne.mockResolvedValue(null);

      await expect(
        service.approve(mockUsageId.toString(), mockUserId.toString(), mockAccountId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error if vehicle usage is already approved', async () => {
      const mockExisting = { ...mockVehicleUsage, status: 'approved' };
      vehicleUsageModel.findOne.mockResolvedValue(mockExisting);

      await expect(
        service.approve(mockUsageId.toString(), mockUserId.toString(), mockAccountId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove vehicle usage successfully', async () => {
      const mockExisting = { ...mockVehicleUsage, status: 'pending' };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockExisting),
      };
      vehicleUsageModel.findOne.mockReturnValueOnce(mockQuery);

      const mockDeleteQuery = {
        exec: jest.fn().mockResolvedValue(mockVehicleUsage),
      };
      vehicleUsageModel.findOneAndDelete.mockReturnValue(mockDeleteQuery);

      const result = await service.remove(mockUsageId.toString(), mockAccountId);

      expect(vehicleUsageModel.findOne).toHaveBeenCalledWith({
        _id: mockUsageId.toString(),
        account: mockAccountId,
      });
      expect(vehicleUsageModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockUsageId.toString(),
        account: mockAccountId,
      });
      expect(result).toEqual(mockVehicleUsage);
    });

    it('should throw error if vehicle usage not found', async () => {
      vehicleUsageModel.findOne.mockResolvedValue(null);

      await expect(
        service.remove(mockUsageId.toString(), mockAccountId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error if vehicle usage is already approved', async () => {
      const mockExisting = { ...mockVehicleUsage, status: 'approved' };
      vehicleUsageModel.findOne.mockResolvedValue(mockExisting);

      await expect(
        service.remove(mockUsageId.toString(), mockAccountId)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});