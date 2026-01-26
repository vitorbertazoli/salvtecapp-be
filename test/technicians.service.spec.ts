import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role } from '../src/roles/schemas/role.schema';
import { Technician } from '../src/technicians/schemas/technician.schema';
import { TechniciansService } from '../src/technicians/technicians.service';
import { UsersService } from '../src/users/users.service';

describe('TechniciansService', () => {
  let service: TechniciansService;
  let technicianModel: any;
  let roleModel: any;
  let usersService: any;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  const mockTechnicianId = new Types.ObjectId();
  const mockCreatedBy = new Types.ObjectId('64b7f8f8f8f8f8f8f8f8f8f8');
  const mockUpdatedBy = new Types.ObjectId('64b7f8f8f8f8f8f8f8f8f8f9');

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
    user: mockUserId,
    createdBy: mockCreatedBy,
    updatedBy: mockUpdatedBy,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTechnicianArray = [mockTechnician];

  const mockUser = {
    _id: mockUserId,
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao.silva@example.com',
    roles: ['TECHNICIAN']
  };

  const mockRole = {
    _id: new Types.ObjectId(),
    name: 'TECHNICIAN'
  };

  beforeEach(async () => {
    const mockTechnicianModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockTechnician,
        ...data,
        toObject: jest.fn().mockReturnValue({
          ...mockTechnician,
          ...data
        })
      }),
      populate: jest.fn().mockReturnThis()
    }));

    // Add static methods
    mockTechnicianModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn()
            })
          })
        })
      }),
      exec: jest.fn()
    });
    mockTechnicianModel.findOne = jest.fn().mockImplementation(() => {
      const createMockQuery = () => ({
        populate: jest.fn().mockImplementation(() => createMockQuery()),
        exec: jest.fn()
      });
      return createMockQuery();
    });
    mockTechnicianModel.findOneAndUpdate = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn()
        })
      })
    });
    mockTechnicianModel.findOneAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn()
    });
    mockTechnicianModel.deleteMany = jest.fn().mockReturnValue({
      exec: jest.fn()
    });
    mockTechnicianModel.aggregate = jest.fn().mockReturnValue({
      exec: jest.fn()
    });

    const mockRoleModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRole])
      })
    };

    const mockUsersService = {
      findOneByAccountAndEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechniciansService,
        {
          provide: getModelToken(Technician.name),
          useValue: mockTechnicianModel
        },
        {
          provide: getModelToken(Role.name),
          useValue: mockRoleModel
        },
        {
          provide: UsersService,
          useValue: mockUsersService
        }
      ]
    }).compile();

    service = module.get<TechniciansService>(TechniciansService);
    technicianModel = module.get(getModelToken(Technician.name));
    roleModel = module.get(getModelToken(Role.name));
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a technician without user account', async () => {
      const addressData = {
        street: 'Rua Teste',
        number: '123',
        complement: 'Apt 456',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234567',
        country: 'Brazil'
      };

      const userAccountData = {
        password: 'password123',
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao.silva@example.com',
        roles: ['TECHNICIAN']
      };

      usersService.findOneByAccountAndEmail.mockResolvedValue(null);
      roleModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRole])
      });
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.create(mockAccountId, '12345678901', addressData, mockCreatedBy, mockUpdatedBy, userAccountData);

      expect(technicianModel).toHaveBeenCalledWith({
        account: new Types.ObjectId(mockAccountId),
        cpf: '12345678901',
        address: {
          ...addressData,
          country: 'Brazil'
        },
        user: mockUser,
        createdBy: mockCreatedBy,
        updatedBy: mockUpdatedBy
      });
      expect(result).toMatchObject({
        account: mockAccountId,
        cpf: '12345678901',
        address: {
          ...addressData,
          country: 'Brazil'
        },
        user: mockUser,
        createdBy: mockCreatedBy,
        updatedBy: mockUpdatedBy
      });
    });

    it('should create a technician with user account', async () => {
      const addressData = {
        street: 'Rua Teste',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234567'
      };

      const userAccountData = {
        password: 'password123',
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao.silva@example.com',
        roles: ['TECHNICIAN']
      };

      usersService.findOneByAccountAndEmail.mockResolvedValue(null);
      roleModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRole])
      });
      usersService.create.mockResolvedValue(mockUser);

      const result = await service.create(mockAccountId, '12345678901', addressData, mockCreatedBy, mockUpdatedBy, userAccountData);

      expect(usersService.findOneByAccountAndEmail).toHaveBeenCalledWith(mockAccountId, 'joao.silva@example.com');
      expect(roleModel.find).toHaveBeenCalledWith({ name: { $in: ['TECHNICIAN'] } });
      expect(usersService.create).toHaveBeenCalledWith(
        mockAccountId,
        'João',
        'Silva',
        'joao.silva@example.com',
        'password123',
        [mockRole._id.toString()],
        'active',
        mockCreatedBy,
        mockUpdatedBy,
        userAccountData.phoneNumber
      );
      expect(result).toMatchObject({
        account: mockAccountId,
        cpf: '12345678901',
        address: {
          street: 'Rua Teste',
          number: '123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234567',
          country: 'Brazil'
        },
        user: mockUser,
        createdBy: mockCreatedBy,
        updatedBy: mockUpdatedBy
      });
    });

    it('should throw error when email already exists', async () => {
      const addressData = {
        street: 'Rua Teste',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234567'
      };

      const userAccountData = {
        password: 'password123',
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao.silva@example.com',
        roles: ['TECHNICIAN'],
        phoneNumber: '+5511999999999'
      };

      usersService.findOneByAccountAndEmail.mockResolvedValue(mockUser);

      await expect(service.create(mockAccountId, '12345678901', addressData, mockCreatedBy, mockUpdatedBy, userAccountData)).rejects.toThrow(
        'technicians.errors.emailAlreadyExists'
      );
    });
  });

  describe('findByAccount', () => {
    it('should return paginated technicians without search', async () => {
      const mockAggregateResult = [
        {
          technicians: mockTechnicianArray,
          totalCount: [{ count: 1 }]
        }
      ];

      technicianModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '');

      expect(technicianModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        technicians: mockTechnicianArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should return paginated technicians with search', async () => {
      const mockAggregateResult = [
        {
          technicians: mockTechnicianArray,
          totalCount: [{ count: 1 }]
        }
      ];

      technicianModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, 'João Silva');

      expect(technicianModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        technicians: mockTechnicianArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should filter by status when provided', async () => {
      const mockAggregateResult = [
        {
          technicians: mockTechnicianArray,
          totalCount: [{ count: 1 }]
        }
      ];

      technicianModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '', 'active');

      expect(technicianModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        technicians: mockTechnicianArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should handle empty results', async () => {
      const mockAggregateResult = [
        {
          technicians: [],
          totalCount: []
        }
      ];

      technicianModel.aggregate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockAggregateResult)
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '');

      expect(result).toEqual({
        technicians: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      });
    });
  });

  describe('findByIdAndAccount', () => {
    it('should return a technician by id and account', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTechnician)
      };
      technicianModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findByIdAndAccount(mockTechnicianId.toString(), mockAccountId);

      expect(technicianModel.findOne).toHaveBeenCalledWith({
        _id: mockTechnicianId.toString(),
        account: mockAccountId
      });
      expect(mockQuery.populate).toHaveBeenCalledWith('account', 'name id');
      expect(mockQuery.populate).toHaveBeenCalledWith('user', 'email firstName lastName phoneNumber');
      expect(result).toEqual(mockTechnician);
    });

    it('should return null when technician not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      };
      technicianModel.findOne.mockReturnValue(mockQuery);

      const result = await service.findByIdAndAccount('nonexistent-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return a technician by user id', async () => {
      technicianModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockTechnician)
        })
      });

      const result = await service.findByUserId(mockUserId.toString());

      expect(technicianModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(mockUserId.toString())
      });
      expect(result).toEqual(mockTechnician);
    });
  });

  describe('findOneByCpfAndAccount', () => {
    it('should return a technician by cpf and account', async () => {
      technicianModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockTechnician)
          })
        })
      });

      const result = await service.findOneByCpfAndAccount('12345678901', mockAccountId);

      expect(technicianModel.findOne).toHaveBeenCalledWith({
        cpf: '12345678901',
        account: mockAccountId
      });
      expect(result).toEqual(mockTechnician);
    });
  });

  describe('update', () => {
    it('should update a technician without user account', async () => {
      const updateData = {
        cpf: '98765432100',
        phoneNumber: '+5511888888888',
        status: 'inactive' as const,
        updatedBy: mockUpdatedBy
      };

      technicianModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null) // No user associated
        })
      });

      technicianModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ ...mockTechnician, ...updateData })
          })
        })
      });

      const result = await service.update(mockTechnicianId.toString(), mockAccountId, updateData);

      expect(technicianModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockTechnicianId.toString(), account: mockAccountId }, updateData, { new: true });
      expect(result).toMatchObject({ ...mockTechnician, ...updateData });
    });

    it('should update a technician with user account', async () => {
      const updateData = {
        cpf: '98765432100',
        updatedBy: mockUpdatedBy
      };

      const userAccountData = {
        firstName: 'João Updated',
        lastName: 'Silva Updated',
        email: 'joao.updated@example.com'
      };

      technicianModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockTechnician, user: mockUser })
        })
      });

      roleModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockRole])
      });
      usersService.update.mockResolvedValue(mockUser);

      technicianModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ ...mockTechnician, ...updateData })
          })
        })
      });

      const result = await service.update(mockTechnicianId.toString(), mockAccountId, updateData, userAccountData);

      expect(usersService.update).toHaveBeenCalledWith(
        mockUserId,
        {
          firstName: 'João Updated',
          lastName: 'Silva Updated',
          email: 'joao.updated@example.com',
          roles: [mockRole._id.toString()],
          updatedBy: mockUpdatedBy
        },
        mockAccountId
      );
      expect(result).toMatchObject({ ...mockTechnician, ...updateData });
    });

    it('should handle date conversion in update', async () => {
      const updateData = {
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-12-31'),
        updatedBy: mockUpdatedBy
      };

      technicianModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null)
        })
      });

      technicianModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({ ...mockTechnician, ...updateData })
          })
        })
      });

      const result = await service.update(mockTechnicianId.toString(), mockAccountId, updateData);

      expect(technicianModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockTechnicianId.toString(), account: mockAccountId }, updateData, { new: true });
      expect(result).toMatchObject({ ...mockTechnician, ...updateData });
    });
  });

  describe('delete', () => {
    it('should delete a technician with associated user', async () => {
      technicianModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTechnician)
      });
      usersService.delete.mockResolvedValue(mockUser);

      technicianModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTechnician)
      });

      const result = await service.delete(mockTechnicianId.toString(), mockAccountId);

      expect(technicianModel.findOne).toHaveBeenCalledWith({
        _id: mockTechnicianId.toString(),
        account: mockAccountId
      });
      expect(technicianModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockTechnicianId.toString(),
        account: mockAccountId
      });
      expect(result).toEqual(mockTechnician);
    });

    it('should delete a technician without associated user', async () => {
      const technicianWithoutUser = { ...mockTechnician, user: undefined };

      technicianModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(technicianWithoutUser)
      });

      technicianModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(technicianWithoutUser)
      });

      const result = await service.delete(mockTechnicianId.toString(), mockAccountId);

      expect(usersService.delete).not.toHaveBeenCalled();
      expect(result).toEqual(technicianWithoutUser);
    });

    it('should return null when technician not found', async () => {
      technicianModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });
      technicianModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.delete('nonexistent-id', mockAccountId);

      expect(technicianModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: 'nonexistent-id',
        account: mockAccountId
      });
      expect(result).toBeNull();
    });
  });

  describe('deleteAllByAccount', () => {
    it('should delete all technicians and their associated users', async () => {
      technicianModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockTechnician])
      });
      usersService.delete.mockResolvedValue(mockUser);
      technicianModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 })
      });

      const result = await service.deleteAllByAccount(mockAccountId);

      expect(technicianModel.find).toHaveBeenCalledWith({ account: mockAccountId });
      expect(technicianModel.deleteMany).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual({ deletedCount: 1 });
    });

    it('should handle technicians without associated users', async () => {
      const technicianWithoutUser = { ...mockTechnician, user: undefined };

      technicianModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([technicianWithoutUser])
      });
      technicianModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 })
      });

      const result = await service.deleteAllByAccount(mockAccountId);

      expect(usersService.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ deletedCount: 1 });
    });
  });
});
