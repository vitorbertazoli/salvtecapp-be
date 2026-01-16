import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VehiclesService } from '../src/vehicles/vehicles.service';
import { Vehicle, VehicleDocument } from '../src/vehicles/schemas/vehicles.schema';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let vehicleModel: any;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockVehicleId = new Types.ObjectId();
  const mockCreatedBy = 'user123';
  const mockUpdatedBy = 'user456';

  const mockVehicle = {
    _id: mockVehicleId,
    account: mockAccountId,
    name: 'Van 001',
    licensePlate: 'ABC-1234',
    make: 'Ford',
    model: 'Transit',
    year: 2020,
    color: 'White',
    mileage: 50000,
    fuelType: 'Diesel',
    status: 'active',
    isActive: true,
    createdBy: mockCreatedBy,
    updatedBy: mockUpdatedBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVehicleArray = [mockVehicle];

  beforeEach(async () => {
    const mockVehicleModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockVehicle,
        ...data,
        toObject: jest.fn().mockReturnValue({
          ...mockVehicle,
          ...data,
        }),
      }),
    }));

    // Add static methods
    mockVehicleModel.find = jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockVehicleArray),
        }),
      }),
      exec: jest.fn().mockResolvedValue(mockVehicleArray),
    });
    mockVehicleModel.findOne = jest.fn().mockImplementation(() => {
      const createMockQuery = () => ({
        exec: jest.fn(),
      });
      return createMockQuery();
    });
    mockVehicleModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });
    mockVehicleModel.countDocuments = jest.fn().mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getModelToken(Vehicle.name),
          useValue: mockVehicleModel,
        },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
    vehicleModel = module.get(getModelToken(Vehicle.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new vehicle successfully', async () => {
      const createData = {
        account: mockAccountId,
        name: 'Van 001',
        licensePlate: 'ABC-1234',
        make: 'Ford',
        model: 'Transit',
        year: 2020,
        color: 'White',
        mileage: 50000,
        fuelType: 'Diesel',
        createdBy: mockCreatedBy,
        updatedBy: mockUpdatedBy,
      };

      const result = await service.create(createData);

      expect(vehicleModel).toHaveBeenCalledWith(createData);
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return vehicles with pagination and search', async () => {
      const result = await service.findAll(mockAccountId, 1, 10, 'Ford');

      expect(vehicleModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        isActive: true,
        $or: [
          { name: { $regex: 'Ford', $options: 'i' } },
          { licensePlate: { $regex: 'Ford', $options: 'i' } },
          { make: { $regex: 'Ford', $options: 'i' } },
          { model: { $regex: 'Ford', $options: 'i' } }
        ]
      });
      expect(vehicleModel.countDocuments).toHaveBeenCalledWith({
        account: mockAccountId,
        isActive: true,
        $or: [
          { name: { $regex: 'Ford', $options: 'i' } },
          { licensePlate: { $regex: 'Ford', $options: 'i' } },
          { make: { $regex: 'Ford', $options: 'i' } },
          { model: { $regex: 'Ford', $options: 'i' } }
        ]
      });
      expect(result).toEqual({
        vehicles: mockVehicleArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should return vehicles without search filter', async () => {
      const result = await service.findAll(mockAccountId, 1, 10, '');

      expect(vehicleModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        isActive: true,
      });
      expect(result).toEqual({
        vehicles: mockVehicleArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should handle pagination correctly', async () => {
      const result = await service.findAll(mockAccountId, 2, 5, '');

      expect(vehicleModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        isActive: true,
      });
      expect(result).toEqual({
        vehicles: mockVehicleArray,
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return vehicle by id and account', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockVehicle),
      };
      vehicleModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findOne(mockVehicleId.toString(), mockAccountId);

      expect(vehicleModel.findOne).toHaveBeenCalledWith({
        _id: mockVehicleId.toString(),
        account: mockAccountId,
      });
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('update', () => {
    it('should update vehicle successfully', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(mockVehicle),
      };
      vehicleModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const updateData = { name: 'Updated Van' };
      const result = await service.update(mockVehicleId.toString(), updateData, mockAccountId);

      expect(vehicleModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockVehicleId.toString(), account: mockAccountId },
        updateData,
        { new: true }
      );
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('remove', () => {
    it('should soft delete vehicle successfully', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ ...mockVehicle, isActive: false }),
      };
      vehicleModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const result = await service.remove(mockVehicleId.toString(), mockAccountId);

      expect(vehicleModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockVehicleId.toString(), account: mockAccountId },
        { isActive: false },
        { new: true }
      );
      expect(result).toEqual({ ...mockVehicle, isActive: false });
    });
  });
});