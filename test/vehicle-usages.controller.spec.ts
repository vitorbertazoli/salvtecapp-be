import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CreateVehicleUsageDto } from '../src/vehicle-usages/dto/create-vehicle-usage.dto';
import { UpdateVehicleUsageDto } from '../src/vehicle-usages/dto/update-vehicle-usage.dto';
import { VehicleUsagesController } from '../src/vehicle-usages/vehicle-usages.controller';
import { VehicleUsagesService } from '../src/vehicle-usages/vehicle-usages.service';

describe('VehicleUsagesController', () => {
  let controller: VehicleUsagesController;
  let vehicleUsagesService: any;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockTechnicianId = new Types.ObjectId();
  const mockVehicleId = new Types.ObjectId();
  const mockUsageId = new Types.ObjectId();

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
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const mockVehicleUsagesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      remove: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleUsagesController],
      providers: [
        {
          provide: VehicleUsagesService,
          useValue: mockVehicleUsagesService
        }
      ]
    })
      .overrideGuard() // Mock guards
      .useValue({})
      .compile();

    controller = module.get<VehicleUsagesController>(VehicleUsagesController);
    vehicleUsagesService = module.get(VehicleUsagesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new vehicle usage', async () => {
      const createDto: CreateVehicleUsageDto = {
        technician: mockTechnicianId.toString(),
        vehicle: mockVehicleId.toString(),
        purpose: 'Service call',
        startDate: new Date('2024-01-01T08:00:00Z'),
        endDate: new Date('2024-01-01T17:00:00Z'),
        mileageStart: 10000,
        mileageEnd: 10100
      };

      vehicleUsagesService.create.mockResolvedValue(mockVehicleUsage);

      const result = await controller.create(createDto, mockAccountId, mockUserId.toString());

      expect(vehicleUsagesService.create).toHaveBeenCalledWith({
        ...createDto,
        account: mockAccountId,
        technician: new Types.ObjectId(mockTechnicianId.toString()),
        vehicle: new Types.ObjectId(mockVehicleId.toString()),
        createdBy: mockUserId,
        updatedBy: mockUserId
      });
      expect(result).toEqual(mockVehicleUsage);
    });
  });

  describe('findAll', () => {
    it('should return all vehicle usages', async () => {
      const mockUsages = [mockVehicleUsage];
      vehicleUsagesService.findAll.mockResolvedValue(mockUsages);

      const result = await controller.findAll(mockAccountId);

      expect(vehicleUsagesService.findAll).toHaveBeenCalledWith(mockAccountId);
      expect(result).toEqual(mockUsages);
    });
  });

  describe('findOne', () => {
    it('should return vehicle usage by id', async () => {
      vehicleUsagesService.findOne.mockResolvedValue(mockVehicleUsage);

      const result = await controller.findOne(mockUsageId.toString(), mockAccountId);

      expect(vehicleUsagesService.findOne).toHaveBeenCalledWith(mockUsageId.toString(), mockAccountId);
      expect(result).toEqual(mockVehicleUsage);
    });

    it('should throw NotFoundException if vehicle usage not found', async () => {
      vehicleUsagesService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(mockUsageId.toString(), mockAccountId)).rejects.toThrow('Vehicle usage not found');
    });
  });

  describe('update', () => {
    it('should update vehicle usage', async () => {
      const updateDto: UpdateVehicleUsageDto = {
        purpose: 'Updated purpose'
      };

      vehicleUsagesService.update.mockResolvedValue(mockVehicleUsage);

      const result = await controller.update(mockUsageId.toString(), updateDto, mockAccountId, mockUserId.toString());

      expect(vehicleUsagesService.update).toHaveBeenCalledWith(
        mockUsageId.toString(),
        {
          ...updateDto,
          updatedBy: mockUserId
        },
        mockAccountId
      );
      expect(result).toEqual(mockVehicleUsage);
    });

    it('should throw NotFoundException if vehicle usage not found', async () => {
      const updateDto: UpdateVehicleUsageDto = {
        purpose: 'Updated purpose'
      };

      vehicleUsagesService.update.mockResolvedValue(null);

      await expect(controller.update(mockUsageId.toString(), updateDto, mockAccountId, mockUserId.toString())).rejects.toThrow('Vehicle usage not found');
    });
  });

  describe('approve', () => {
    it('should approve vehicle usage', async () => {
      vehicleUsagesService.approve.mockResolvedValue({ ...mockVehicleUsage, status: 'approved' });

      const result = await controller.approve(mockUsageId.toString(), mockUserId.toString(), mockAccountId);

      expect(vehicleUsagesService.approve).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything());
      expect(result).toEqual({ ...mockVehicleUsage, status: 'approved' });
    });

    it('should throw NotFoundException if vehicle usage not found', async () => {
      vehicleUsagesService.approve.mockResolvedValue(null);

      await expect(controller.approve(mockUsageId.toString(), mockUserId.toString(), mockAccountId)).rejects.toThrow('Vehicle usage not found');
    });
  });

  describe('remove', () => {
    it('should remove vehicle usage', async () => {
      vehicleUsagesService.remove.mockResolvedValue(mockVehicleUsage);

      const result = await controller.remove(mockUsageId.toString(), mockAccountId);

      expect(vehicleUsagesService.remove).toHaveBeenCalledWith(mockUsageId.toString(), mockAccountId);
      expect(result).toEqual(mockVehicleUsage);
    });

    it('should throw NotFoundException if vehicle usage not found', async () => {
      vehicleUsagesService.remove.mockResolvedValue(null);

      await expect(controller.remove(mockUsageId.toString(), mockAccountId)).rejects.toThrow('Vehicle usage not found');
    });
  });
});
