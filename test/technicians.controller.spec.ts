import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { CreateTechnicianDto } from '../src/technicians/dto/create-technician.dto';
import { UpdateTechnicianDto } from '../src/technicians/dto/update-technician.dto';
import { TechniciansController } from '../src/technicians/technicians.controller';
import { TechniciansService } from '../src/technicians/technicians.service';

describe('TechniciansController', () => {
  let controller: TechniciansController;
  let service: TechniciansService;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockTechnicianId = new Types.ObjectId();

  const mockTechnician = {
    _id: mockTechnicianId,
    account: mockAccountId,
    cpf: '12345678901',
    status: 'active' as const,
    startDate: new Date('2024-01-01'),
    address: {
      street: 'Rua Teste',
      number: '123',
      complement: 'Apt 456',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234567',
      country: 'Brazil'
    },
    user: new Types.ObjectId(),
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTechnicianArray = [mockTechnician];

  const mockTechniciansService = {
    create: jest.fn(),
    findByAccount: jest.fn(),
    findByIdAndAccount: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechniciansController],
      providers: [
        {
          provide: TechniciansService,
          useValue: mockTechniciansService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<TechniciansController>(TechniciansController);
    service = module.get<TechniciansService>(TechniciansService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should throw error when user account not provided', async () => {
      const createTechnicianDto: CreateTechnicianDto = {
        cpf: '12345678901',
        phoneNumber: '+5511999999999',
        address: {
          street: 'Rua Teste',
          number: '123',
          complement: 'Apt 456',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234567',
          country: 'Brazil'
        }
      };

      await expect(controller.create(createTechnicianDto, mockAccountId, mockUserId)).rejects.toThrow('technicians.errors.userAccountDataRequired');
    });

    it('should create a technician with user account', async () => {
      const createTechnicianDto: CreateTechnicianDto = {
        cpf: '12345678901',
        phoneNumber: '+5511999999999',
        address: {
          street: 'Rua Teste',
          number: '123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234567'
        },
        userAccount: {
          password: 'password123',
          firstName: 'João',
          lastName: 'Silva',
          email: 'joao.silva@example.com',
          roles: ['TECHNICIAN']
        }
      };

      mockTechniciansService.create.mockResolvedValue(mockTechnician);

      const result = await controller.create(createTechnicianDto, mockAccountId, mockUserId);

      expect(mockTechniciansService.create).toHaveBeenCalledWith(mockAccountId, '12345678901', createTechnicianDto.address, mockUserId, mockUserId, {
        password: 'password123',
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao.silva@example.com',
        roles: ['TECHNICIAN']
      });
      expect(result).toEqual(mockTechnician);
    });
  });

  describe('findAll', () => {
    it('should return paginated technicians with default parameters', async () => {
      const mockResult = {
        technicians: mockTechnicianArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      mockTechniciansService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('1', '10', '', '', mockAccountId);

      expect(mockTechniciansService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined);
      expect(result).toEqual(mockResult);
    });

    it('should return paginated technicians with custom parameters', async () => {
      const mockResult = {
        technicians: mockTechnicianArray,
        total: 1,
        page: 2,
        limit: 20,
        totalPages: 1
      };
      mockTechniciansService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('2', '20', 'João Silva', 'active', mockAccountId);

      expect(mockTechniciansService.findByAccount).toHaveBeenCalledWith(mockAccountId, 2, 20, 'João Silva', 'active');
      expect(result).toEqual(mockResult);
    });

    it('should handle invalid page and limit parameters', async () => {
      const mockResult = {
        technicians: mockTechnicianArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      mockTechniciansService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('invalid', 'invalid', '', '', mockAccountId);

      expect(mockTechniciansService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return technician by id for admin user', async () => {
      const adminUser = {
        id: mockUserId,
        roles: ['ADMIN']
      };

      mockTechniciansService.findByIdAndAccount.mockResolvedValue(mockTechnician);

      const result = await controller.findOne(mockTechnicianId.toString(), mockAccountId, adminUser);

      expect(mockTechniciansService.findByIdAndAccount).toHaveBeenCalledWith(mockTechnicianId.toString(), mockAccountId);
      expect(result).toEqual(mockTechnician);
    });

    it('should return current user technician record for non-admin user', async () => {
      const nonAdminUser = {
        id: mockUserId,
        roles: ['TECHNICIAN'],
        technicianId: mockTechnicianId.toString()
      };

      mockTechniciansService.findByIdAndAccount.mockResolvedValue(mockTechnician);

      const result = await controller.findOne('some-other-id', mockAccountId, nonAdminUser);

      expect(mockTechniciansService.findByIdAndAccount).toHaveBeenCalledWith(mockTechnicianId.toString(), mockAccountId);
      expect(result).toEqual(mockTechnician);
    });

    it('should return null for non-admin user without technicianId', async () => {
      const nonAdminUser = {
        id: mockUserId,
        roles: ['TECHNICIAN'],
        technicianId: undefined
      };

      const result = await controller.findOne('some-id', mockAccountId, nonAdminUser);

      expect(mockTechniciansService.findByIdAndAccount).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle user without roles array', async () => {
      const userWithoutRoles = {
        id: mockUserId,
        technicianId: mockTechnicianId.toString()
      };

      mockTechniciansService.findByIdAndAccount.mockResolvedValue(mockTechnician);

      const result = await controller.findOne('some-other-id', mockAccountId, userWithoutRoles);

      expect(mockTechniciansService.findByIdAndAccount).toHaveBeenCalledWith(mockTechnicianId.toString(), mockAccountId);
      expect(result).toEqual(mockTechnician);
    });
  });

  describe('update', () => {
    it('should update a technician without user account', async () => {
      const updateTechnicianDto: UpdateTechnicianDto = {
        cpf: '98765432100',
        phoneNumber: '+5511888888888',
        status: 'inactive',
        address: {
          street: 'Rua Updated',
          number: '456',
          city: 'Rio de Janeiro',
          state: 'RJ',
          zipCode: '22222222'
        }
      };

      const expectedTechnicianData = {
        cpf: '98765432100',
        status: 'inactive',
        updatedBy: mockUserId,
        address: updateTechnicianDto.address
      };

      mockTechniciansService.update.mockResolvedValue({
        ...mockTechnician,
        ...expectedTechnicianData
      });

      const result = await controller.update(mockTechnicianId.toString(), updateTechnicianDto, mockAccountId, mockUserId);

      expect(mockTechniciansService.update).toHaveBeenCalledWith(mockTechnicianId.toString(), mockAccountId, expectedTechnicianData, undefined);
      expect(result).toMatchObject({
        ...mockTechnician,
        ...expectedTechnicianData
      });
    });

    it('should update a technician with user account', async () => {
      const updateTechnicianDto: UpdateTechnicianDto = {
        userAccount: {
          firstName: 'João Updated',
          lastName: 'Silva Updated',
          email: 'joao.updated@example.com'
        }
      };

      const expectedTechnicianData = {
        updatedBy: mockUserId,
        address: undefined,
        startDate: undefined,
        endDate: undefined
      };

      const expectedUserAccountData = {
        firstName: 'João Updated',
        lastName: 'Silva Updated',
        email: 'joao.updated@example.com',
        roles: ['TECHNICIAN']
      };

      mockTechniciansService.update.mockResolvedValue({
        ...mockTechnician,
        ...expectedTechnicianData
      });

      const result = await controller.update(mockTechnicianId.toString(), updateTechnicianDto, mockAccountId, mockUserId);

      expect(mockTechniciansService.update).toHaveBeenCalledWith(mockTechnicianId.toString(), mockAccountId, expectedTechnicianData, expectedUserAccountData);
      expect(result).toMatchObject({
        ...mockTechnician,
        ...expectedTechnicianData
      });
    });

    it('should handle date conversion', async () => {
      const updateTechnicianDto: UpdateTechnicianDto = {
        startDate: '2024-02-01',
        endDate: '2024-12-31'
      };

      const expectedTechnicianData = {
        updatedBy: mockUserId,
        address: undefined,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-12-31')
      };

      mockTechniciansService.update.mockResolvedValue({
        ...mockTechnician,
        ...expectedTechnicianData
      });

      const result = await controller.update(mockTechnicianId.toString(), updateTechnicianDto, mockAccountId, mockUserId);

      expect(mockTechniciansService.update).toHaveBeenCalledWith(mockTechnicianId.toString(), mockAccountId, expectedTechnicianData, undefined);
      expect(result).toMatchObject({
        ...mockTechnician,
        ...expectedTechnicianData
      });
    });
  });

  describe('remove', () => {
    it('should delete a technician', async () => {
      mockTechniciansService.delete.mockResolvedValue(mockTechnician);

      const result = await controller.remove(mockTechnicianId.toString(), mockAccountId);

      expect(mockTechniciansService.delete).toHaveBeenCalledWith(mockTechnicianId.toString(), mockAccountId);
      expect(result).toEqual(mockTechnician);
    });
  });
});
