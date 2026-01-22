import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentTypeController } from '../src/equipmentType/equipment-type.controller';
import { EquipmentTypeService } from '../src/equipmentType/equipment-type.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

describe('EquipmentTypeController', () => {
  let controller: EquipmentTypeController;
  let service: EquipmentTypeService;

  const mockEquipmentType = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Laptop',
    description: 'Portable computer',
    isActive: true,
    createdBy: 'user123',
    updatedBy: 'user123',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockEquipmentTypeArray = [
    mockEquipmentType,
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'Desktop',
      description: 'Stationary computer',
      isActive: true,
      createdBy: 'user123',
      updatedBy: 'user123',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockEquipmentTypeService = {
    findAll: jest.fn(),
    findOne: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EquipmentTypeController],
      providers: [
        {
          provide: EquipmentTypeService,
          useValue: mockEquipmentTypeService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<EquipmentTypeController>(EquipmentTypeController);
    service = module.get<EquipmentTypeService>(EquipmentTypeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all equipment types', async () => {
      mockEquipmentTypeService.findAll.mockResolvedValue(mockEquipmentTypeArray);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockEquipmentTypeArray);
    });

    it('should return empty array when no equipment types exist', async () => {
      mockEquipmentTypeService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single equipment type by id', async () => {
      const id = '507f1f77bcf86cd799439011';
      mockEquipmentTypeService.findOne.mockResolvedValue(mockEquipmentType);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockEquipmentType);
    });

    it('should return null when equipment type is not found', async () => {
      const id = 'nonexistent-id';
      mockEquipmentTypeService.findOne.mockResolvedValue(null);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toBeNull();
    });
  });
});
