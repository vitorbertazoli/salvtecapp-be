import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { ContractsController } from '../src/contracts/contracts.controller';
import { ContractsService } from '../src/contracts/contracts.service';
import { CreateContractDto } from '../src/contracts/dto/create-contract.dto';
import { UpdateContractDto } from '../src/contracts/dto/update-contract.dto';

describe('ContractsController', () => {
  let controller: ContractsController;
  let contractsService: jest.Mocked<ContractsService>;

  const mockContractId = '507f1f77bcf86cd799439011';
  const mockAccountId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockCustomerId = '507f1f77bcf86cd799439013';
  const mockUserId = '507f1f77bcf86cd799439014';

  const mockContract = {
    _id: mockContractId,
    startDate: new Date('2024-01-01'),
    expireDate: new Date('2024-12-31'),
    status: 'active' as const,
    frequency: 'monthly' as const,
    terms: 'Test contract terms',
    value: 1000,
    customer: mockCustomerId,
    account: mockAccountId,
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockPaginatedResult = {
    contracts: [mockContract],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1
  };

  beforeEach(async () => {
    const mockContractsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByAccount: jest.fn(),
      findOne: jest.fn(),
      findByIdAndAccount: jest.fn(),
      updateByAccount: jest.fn(),
      deleteByAccount: jest.fn(),
      deleteAllByAccount: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [
        {
          provide: ContractsService,
          useValue: mockContractsService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContractsController>(ContractsController);
    contractsService = module.get(ContractsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a contract successfully', async () => {
      const createDto: CreateContractDto = {
        startDate: '2024-01-01',
        expireDate: '2024-12-31',
        status: 'active',
        frequency: 'monthly',
        terms: 'Test contract terms',
        value: 1000,
        customer: mockCustomerId
      };

      contractsService.create.mockResolvedValue(mockContract as any);

      const result = await controller.create(createDto, mockUserId, mockAccountId);

      expect(contractsService.create).toHaveBeenCalledWith({
        ...createDto,
        account: mockAccountId,
        customer: new Types.ObjectId(mockCustomerId),
        createdBy: new Types.ObjectId(mockUserId),
        updatedBy: new Types.ObjectId(mockUserId)
      });
      expect(result).toEqual(mockContract);
    });
  });

  describe('findAll', () => {
    it('should return paginated contracts with default parameters', async () => {
      contractsService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('1', '10', '', '', mockAccountId);

      expect(contractsService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should return paginated contracts with search and status', async () => {
      const search = 'test search';
      const status = 'active';
      contractsService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('2', '20', search, status, mockAccountId);

      expect(contractsService.findByAccount).toHaveBeenCalledWith(mockAccountId, 2, 20, search, status);
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should handle invalid page and limit values', async () => {
      contractsService.findByAccount.mockResolvedValue(mockPaginatedResult);

      const result = await controller.findAll('invalid', 'invalid', '', '', mockAccountId);

      expect(contractsService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '', undefined);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return a contract by id', async () => {
      contractsService.findByIdAndAccount.mockResolvedValue(mockContract as any);

      const result = await controller.findOne(mockContractId, mockAccountId);

      expect(contractsService.findByIdAndAccount).toHaveBeenCalledWith(mockContractId, mockAccountId);
      expect(result).toEqual(mockContract);
    });

    it('should return null when contract not found', async () => {
      contractsService.findByIdAndAccount.mockResolvedValue(null);

      const result = await controller.findOne(mockContractId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a contract successfully', async () => {
      const updateDto: UpdateContractDto = {
        terms: 'Updated terms',
        value: 1500,
        customer: mockCustomerId
      };

      const updatedContract = { ...mockContract, ...updateDto };
      contractsService.updateByAccount.mockResolvedValue(updatedContract as any);

      const result = await controller.update(mockContractId, updateDto, mockUserId, mockAccountId);

      expect(contractsService.updateByAccount).toHaveBeenCalledWith(
        mockContractId,
        {
          ...updateDto,
          customer: new Types.ObjectId(mockCustomerId),
          updatedBy: new Types.ObjectId(mockUserId)
        },
        mockAccountId
      );
      expect(result).toEqual(updatedContract);
    });

    it('should update contract without customer change', async () => {
      const updateDto: UpdateContractDto = {
        terms: 'Updated terms only'
      };

      const updatedContract = { ...mockContract, ...updateDto };
      contractsService.updateByAccount.mockResolvedValue(updatedContract as any);

      const result = await controller.update(mockContractId, updateDto, mockUserId, mockAccountId);

      expect(contractsService.updateByAccount).toHaveBeenCalledWith(
        mockContractId,
        {
          ...updateDto,
          updatedBy: new Types.ObjectId(mockUserId)
        },
        mockAccountId
      );
      expect(result).toEqual(updatedContract);
    });
  });

  describe('remove', () => {
    it('should delete a contract successfully', async () => {
      contractsService.deleteByAccount.mockResolvedValue(mockContract as any);

      const result = await controller.remove(mockContractId, mockAccountId);

      expect(contractsService.deleteByAccount).toHaveBeenCalledWith(mockContractId, mockAccountId);
      expect(result).toEqual(mockContract);
    });

    it('should return null when contract not found', async () => {
      contractsService.deleteByAccount.mockResolvedValue(null);

      const result = await controller.remove(mockContractId, mockAccountId);

      expect(result).toBeNull();
    });
  });
});
