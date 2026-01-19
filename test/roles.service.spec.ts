import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RolesService } from '../src/roles/roles.service';
import { Role, RoleDocument } from '../src/roles/schemas/role.schema';

describe('RolesService', () => {
  let service: RolesService;
  let roleModel: any;

  const mockUserId = new Types.ObjectId();

  const mockRole = {
    _id: '507f1f77bcf86cd799439011',
    name: 'ADMIN',
    description: 'Administrator role',
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRoleArray = [
    mockRole,
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'SUPERVISOR',
      description: 'Supervisor role',
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const mockRoleModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...data,
        _id: '507f1f77bcf86cd799439011',
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          ...data,
          _id: '507f1f77bcf86cd799439011',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      }),
    }));

    // Add static methods
    mockRoleModel.find = jest.fn();
    mockRoleModel.findById = jest.fn();
    mockRoleModel.findOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getModelToken(Role.name),
          useValue: mockRoleModel,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleModel = module.get(getModelToken(Role.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a role successfully', async () => {
      const roleData = {
        name: 'MANAGER',
        description: 'Manager role',
        createdBy: mockUserId,
        updatedBy: mockUserId,
      };

      const result = await service.create(roleData);

      expect(roleModel).toHaveBeenCalledWith(roleData);
      expect(result).toMatchObject({
        name: 'MANAGER',
        description: 'Manager role',
        createdBy: mockUserId,
        updatedBy: mockUserId,
      });
    });
  });

  describe('findAll', () => {
    it('should return all roles except TECHNICIAN', async () => {
      roleModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRoleArray),
      });

      const result = await service.findAll();

      expect(roleModel.find).toHaveBeenCalledWith({ name: { $ne: 'TECHNICIAN' } });
      expect(result).toEqual(mockRoleArray);
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      roleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      const result = await service.findOne(mockRole._id);

      expect(roleModel.findById).toHaveBeenCalledWith(mockRole._id);
      expect(result).toEqual(mockRole);
    });

    it('should return null when role not found', async () => {
      roleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findOne('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should return a role by name', async () => {
      roleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRole),
      });

      const result = await service.findByName('ADMIN');

      expect(roleModel.findOne).toHaveBeenCalledWith({ name: 'ADMIN' });
      expect(result).toEqual(mockRole);
    });

    it('should return null when role not found', async () => {
      roleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByName('NONEXISTENT');

      expect(result).toBeNull();
    });
  });
});