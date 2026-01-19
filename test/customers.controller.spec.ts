import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { CustomersController } from '../src/customers/customers.controller';
import { CustomersService } from '../src/customers/customers.service';
import { CreateCustomerDto } from '../src/customers/dto/create-customer.dto';
import { UpdateCustomerDto } from '../src/customers/dto/update-customer.dto';

describe('CustomersController', () => {
  let controller: CustomersController;
  let customersService: jest.Mocked<CustomersService>;

  const mockCustomerId = '507f1f77bcf86cd799439011';
  const mockAccountId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockTechnicianId = '507f1f77bcf86cd799439013';
  const mockUserId = '507f1f77bcf86cd799439014';

  const mockCustomer = {
    _id: mockCustomerId,
    name: 'Test Customer',
    email: 'customer@example.com',
    type: 'residential' as const,
    cpf: '12345678901',
    status: 'active' as const,
    phoneNumbers: ['1234567890'],
    notes: 'Test notes',
    technicianResponsible: mockTechnicianId,
    account: mockAccountId,
    address: {
      street: 'Test Street',
      number: '123',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Brazil',
    },
    equipments: [
      {
        name: 'AC Unit',
        room: 'Living Room',
        btus: 12000,
        type: 'Air Conditioner',
        maker: 'Test Maker',
        model: 'Test Model',
      },
    ],
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResult = {
    customers: [mockCustomer],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    const mockCustomersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByAccount: jest.fn(),
      findByIdAndAccount: jest.fn(),
      updateByAccount: jest.fn(),
      deleteByAccount: jest.fn(),
      deleteAllByAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomersController>(CustomersController);
    customersService = module.get(CustomersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a customer successfully', async () => {
      const createDto: CreateCustomerDto = {
        name: 'Test Customer',
        email: 'customer@example.com',
        type: 'residential',
        cpf: '12345678901',
        phoneNumbers: ['1234567890'],
        technicianResponsible: mockTechnicianId,
        address: {
          street: 'Test Street',
          number: '123',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
        },
        equipments: [
          {
            name: 'AC Unit',
            room: 'Living Room',
            btus: 12000,
            type: 'Air Conditioner',
            maker: 'Test Maker',
            model: 'Test Model',
          },
        ],
      };

      customersService.create.mockResolvedValue(mockCustomer as any);

      const result = await controller.create(createDto, mockUserId, mockAccountId);

      expect(customersService.create).toHaveBeenCalledWith(
        {
          ...createDto,
          account: mockAccountId,
          technicianResponsible: new Types.ObjectId(mockTechnicianId),
          createdBy: new Types.ObjectId(mockUserId),
          updatedBy: new Types.ObjectId(mockUserId),
        },
        mockAccountId
      );
      expect(result).toEqual(mockCustomer);
    });

    it('should create customer without technician', async () => {
      const createDto: CreateCustomerDto = {
        name: 'Test Customer',
        email: 'customer@example.com',
        type: 'residential',
        cpf: '12345678901',
      };

      customersService.create.mockResolvedValue(mockCustomer as any);

      const result = await controller.create(createDto, mockUserId, mockAccountId);

      expect(customersService.create).toHaveBeenCalledWith(
        {
          ...createDto,
          account: mockAccountId,
          createdBy: new Types.ObjectId(mockUserId),
          updatedBy: new Types.ObjectId(mockUserId),
        },
        mockAccountId
      );
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('findAll', () => {
    it('should return paginated customers with default parameters', async () => {
      customersService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('1', '10', '', '', mockAccountId);

      expect(customersService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should return paginated customers with search and status', async () => {
      const search = 'test search';
      const status = 'active';
      customersService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('2', '20', search, status, mockAccountId);

      expect(customersService.findByAccount).toHaveBeenCalledWith(mockAccountId, 2, 20, search, status);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should handle invalid page and limit values', async () => {
      customersService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('invalid', 'invalid', '', '', mockAccountId);

      expect(customersService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      customersService.findByIdAndAccount.mockResolvedValue(mockCustomer as any);

      const result = await controller.findOne(mockCustomerId, mockAccountId);

      expect(customersService.findByIdAndAccount).toHaveBeenCalledWith(mockCustomerId, mockAccountId);
      expect(result).toEqual(mockCustomer);
    });

    it('should return null when customer not found', async () => {
      customersService.findByIdAndAccount.mockResolvedValue(null);

      const result = await controller.findOne(mockCustomerId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a customer successfully', async () => {
      const updateDto: UpdateCustomerDto = {
        name: 'Updated Customer',
        email: 'updated@example.com',
        technicianResponsible: mockTechnicianId,
        address: {
          street: 'Updated Street',
          city: 'Updated City',
        },
        equipments: [
          {
            name: 'Updated Equipment',
            type: 'Updated Type',
          },
        ],
      };

      const updatedCustomer = { ...mockCustomer, ...updateDto };
      customersService.updateByAccount.mockResolvedValue(updatedCustomer as any);

      const result = await controller.update(mockCustomerId, updateDto, mockUserId, mockAccountId);

      expect(customersService.updateByAccount).toHaveBeenCalledWith(
        mockCustomerId,
        {
          ...updateDto,
          technicianResponsible: new Types.ObjectId(mockTechnicianId),
          updatedBy: new Types.ObjectId(mockUserId),
        },
        mockAccountId
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should update customer without technician change', async () => {
      const updateDto: UpdateCustomerDto = {
        name: 'Updated Customer',
        email: 'updated@example.com',
      };

      const updatedCustomer = { ...mockCustomer, ...updateDto };
      customersService.updateByAccount.mockResolvedValue(updatedCustomer as any);

      const result = await controller.update(mockCustomerId, updateDto, mockUserId, mockAccountId);

      expect(customersService.updateByAccount).toHaveBeenCalledWith(
        mockCustomerId,
        {
          ...updateDto,
          updatedBy: new Types.ObjectId(mockUserId),
        },
        mockAccountId
      );
      expect(result).toEqual(updatedCustomer);
    });
  });

  describe('remove', () => {
    it('should delete a customer successfully', async () => {
      customersService.deleteByAccount.mockResolvedValue(mockCustomer as any);

      const result = await controller.remove(mockCustomerId, mockAccountId);

      expect(customersService.deleteByAccount).toHaveBeenCalledWith(mockCustomerId, mockAccountId);
      expect(result).toEqual(mockCustomer);
    });

    it('should return null when customer not found', async () => {
      customersService.deleteByAccount.mockResolvedValue(null);

      const result = await controller.remove(mockCustomerId, mockAccountId);

      expect(result).toBeNull();
    });
  });
});