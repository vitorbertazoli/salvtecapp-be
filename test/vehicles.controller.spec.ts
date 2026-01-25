import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CreateVehicleDto } from '../src/vehicles/dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../src/vehicles/dto/update-vehicle.dto';
import { VehiclesController } from '../src/vehicles/vehicles.controller';
import { VehiclesService } from '../src/vehicles/vehicles.service';

describe('VehiclesController', () => {
  let controller: VehiclesController;
  let vehiclesService: any;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockVehicleId = new Types.ObjectId();

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
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const mockVehiclesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [
        {
          provide: VehiclesService,
          useValue: mockVehiclesService
        }
      ]
    })
      .overrideGuard() // Mock guards
      .useValue({})
      .compile();

    controller = module.get<VehiclesController>(VehiclesController);
    vehiclesService = module.get(VehiclesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new vehicle', async () => {
      const createDto: CreateVehicleDto = {
        name: 'Van 001',
        licensePlate: 'ABC-1234',
        make: 'Ford',
        model: 'Transit',
        year: 2020,
        color: 'White',
        mileage: 50000,
        fuelType: 'Diesel'
      };

      vehiclesService.create.mockResolvedValue(mockVehicle);

      const result = await controller.create(createDto, mockAccountId, mockUserId.toString());

      expect(vehiclesService.create).toHaveBeenCalledWith({
        ...createDto,
        account: mockAccountId,
        createdBy: mockUserId,
        updatedBy: mockUserId
      });
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('findAll', () => {
    it('should return vehicles with pagination and search', async () => {
      const mockResult = {
        vehicles: [mockVehicle],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      vehiclesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll('1', '10', 'Ford', mockAccountId);

      expect(vehiclesService.findAll).toHaveBeenCalledWith(mockAccountId, 1, 10, 'Ford');
      expect(result).toEqual(mockResult);
    });

    it('should use default pagination values', async () => {
      const mockResult = {
        vehicles: [mockVehicle],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      vehiclesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(undefined, undefined, '', mockAccountId);

      expect(vehiclesService.findAll).toHaveBeenCalledWith(mockAccountId, 1, 10, '');
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return vehicle by id', async () => {
      vehiclesService.findOne.mockResolvedValue(mockVehicle);

      const result = await controller.findOne(mockVehicleId.toString(), mockAccountId);

      expect(vehiclesService.findOne).toHaveBeenCalledWith(mockVehicleId.toString(), mockAccountId);
      expect(result).toEqual(mockVehicle);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      vehiclesService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(mockVehicleId.toString(), mockAccountId)).rejects.toThrow('vehicles.notFound');
    });
  });

  describe('update', () => {
    it('should update vehicle', async () => {
      const updateDto: UpdateVehicleDto = {
        name: 'Updated Van',
        mileage: 60000
      };

      vehiclesService.update.mockResolvedValue(mockVehicle);

      const result = await controller.update(mockVehicleId.toString(), updateDto, mockAccountId, mockUserId.toString());

      expect(vehiclesService.update).toHaveBeenCalledWith(
        mockVehicleId.toString(),
        {
          ...updateDto,
          updatedBy: mockUserId
        },
        mockAccountId
      );
      expect(result).toEqual(mockVehicle);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      const updateDto: UpdateVehicleDto = {
        name: 'Updated Van'
      };

      vehiclesService.update.mockResolvedValue(null);

      await expect(controller.update(mockVehicleId.toString(), updateDto, mockAccountId, mockUserId.toString())).rejects.toThrow('vehicles.notFound');
    });
  });

  describe('remove', () => {
    it('should remove vehicle', async () => {
      vehiclesService.remove.mockResolvedValue(mockVehicle);

      const result = await controller.remove(mockVehicleId.toString(), mockAccountId);

      expect(vehiclesService.remove).toHaveBeenCalledWith(mockVehicleId.toString(), mockAccountId);
      expect(result).toEqual(mockVehicle);
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      vehiclesService.remove.mockResolvedValue(null);

      await expect(controller.remove(mockVehicleId.toString(), mockAccountId)).rejects.toThrow('vehicles.notFound');
    });
  });
});
