import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EquipmentTypeService } from '../src/equipmentType/equipment-type.service';
import { EquipmentType, EquipmentTypeDocument } from '../src/equipmentType/schemas/equipment-type.schema';

describe('EquipmentTypeService', () => {
  let service: EquipmentTypeService;
  let equipmentTypeModel: Model<EquipmentTypeDocument>;

  const mockEquipmentType = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Laptop',
    description: 'Portable computer',
    isActive: true,
    createdBy: 'user123',
    updatedBy: 'user123',
    createdAt: new Date(),
    updatedAt: new Date(),
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
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const mockEquipmentTypeModel = {
      find: jest.fn(),
      findById: jest.fn(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentTypeService,
        {
          provide: getModelToken(EquipmentType.name),
          useValue: mockEquipmentTypeModel,
        },
      ],
    }).compile();

    service = module.get<EquipmentTypeService>(EquipmentTypeService);
    equipmentTypeModel = module.get<Model<EquipmentTypeDocument>>(getModelToken(EquipmentType.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all equipment types', async () => {
      jest.spyOn(equipmentTypeModel, 'find').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEquipmentTypeArray),
      } as any);

      const result = await service.findAll();

      expect(equipmentTypeModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockEquipmentTypeArray);
    });

    it('should return empty array when no equipment types exist', async () => {
      jest.spyOn(equipmentTypeModel, 'find').mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.findAll();

      expect(equipmentTypeModel.find).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a single equipment type by id', async () => {
      const id = '507f1f77bcf86cd799439011';
      jest.spyOn(equipmentTypeModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEquipmentType),
      } as any);

      const result = await service.findOne(id);

      expect(equipmentTypeModel.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockEquipmentType);
    });

    it('should return null when equipment type is not found', async () => {
      const id = 'nonexistent-id';
      jest.spyOn(equipmentTypeModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.findOne(id);

      expect(equipmentTypeModel.findById).toHaveBeenCalledWith(id);
      expect(result).toBeNull();
    });
  });
});