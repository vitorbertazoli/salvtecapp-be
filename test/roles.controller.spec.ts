import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { RolesController } from '../src/roles/roles.controller';
import { RolesService } from '../src/roles/roles.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

describe('RolesController', () => {
  let controller: RolesController;
  let service: RolesService;

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

  const mockRolesService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<RolesController>(RolesController);
    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      mockRolesService.findAll.mockResolvedValue(mockRoleArray);

      const result = await controller.findAll();

      expect(mockRolesService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockRoleArray);
    });
  });
});