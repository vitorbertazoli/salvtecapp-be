import { Test, TestingModule } from '@nestjs/testing';
import { ServicesController } from '../src/services/services.controller';
import { ServicesService } from '../src/services/services.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Types } from 'mongoose';
import { CreateServiceDto } from '../src/services/dto/create-service.dto';
import { UpdateServiceDto } from '../src/services/dto/update-service.dto';

describe('ServicesController', () => {
  let controller: ServicesController;
  let service: ServicesService;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

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

  const mockServicesService = {
    create: jest.fn(),
    findByAccount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [
        {
          provide: ServicesService,
          useValue: mockServicesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ServicesController>(ServicesController);
    service = module.get<ServicesService>(ServicesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a service', async () => {
      const createServiceDto: CreateServiceDto = {
        name: 'New Service',
        description: 'New service description',
        value: 200.00,
      };

      const expectedServiceData = {
        ...createServiceDto,
        account: mockAccountId,
        createdBy: mockUserId,
        updatedBy: mockUserId,
      };

      mockServicesService.create.mockResolvedValue(mockService);

      const result = await controller.create(createServiceDto, mockAccountId, mockUserId);

      expect(mockServicesService.create).toHaveBeenCalledWith(expectedServiceData);
      expect(result).toEqual(mockService);
    });
  });

  describe('findAll', () => {
    it('should return paginated services with default parameters', async () => {
      const mockResult = {
        services: mockServiceArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockServicesService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('1', '10', '', mockAccountId);

      expect(mockServicesService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '');
      expect(result).toEqual(mockResult);
    });

    it('should return paginated services with custom parameters', async () => {
      const mockResult = {
        services: mockServiceArray,
        total: 1,
        page: 2,
        limit: 20,
        totalPages: 1,
      };
      mockServicesService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('2', '20', 'search term', mockAccountId);

      expect(mockServicesService.findByAccount).toHaveBeenCalledWith(mockAccountId, 2, 20, 'search term');
      expect(result).toEqual(mockResult);
    });

    it('should handle invalid page and limit parameters', async () => {
      const mockResult = {
        services: mockServiceArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockServicesService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('invalid', 'invalid', '', mockAccountId);

      expect(mockServicesService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '');
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return a single service', async () => {
      mockServicesService.findOne.mockResolvedValue(mockService);

      const result = await controller.findOne(mockService._id.toString(), mockAccountId);

      expect(mockServicesService.findOne).toHaveBeenCalledWith(mockService._id.toString(), mockAccountId);
      expect(result).toEqual(mockService);
    });
  });

  describe('update', () => {
    it('should update a service', async () => {
      const updateServiceDto: UpdateServiceDto = {
        name: 'Updated Service',
        value: 250.00,
      };

      const expectedServiceData = {
        ...updateServiceDto,
        updatedBy: mockUserId,
      };

      mockServicesService.update.mockResolvedValue({
        ...mockService,
        ...updateServiceDto,
      });

      const result = await controller.update(mockService._id.toString(), updateServiceDto, mockAccountId, mockUserId);

      expect(mockServicesService.update).toHaveBeenCalledWith(mockService._id.toString(), expectedServiceData, mockAccountId);
      expect(result).toMatchObject({
        ...mockService,
        ...updateServiceDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a service', async () => {
      mockServicesService.delete.mockResolvedValue(mockService);

      const result = await controller.remove(mockService._id.toString(), mockAccountId);

      expect(mockServicesService.delete).toHaveBeenCalledWith(mockService._id.toString(), mockAccountId);
      expect(result).toEqual(mockService);
    });
  });
});