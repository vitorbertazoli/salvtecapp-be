import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { ContractsService } from '../src/contracts/contracts.service';
import { Contract, ContractDocument } from '../src/contracts/schemas/contract.schema';
import { CustomersService } from '../src/customers/customers.service';

describe('ContractsService', () => {
  let service: ContractsService;
  let contractModel: jest.Mocked<Model<ContractDocument>>;
  let customersService: jest.Mocked<CustomersService>;

  const mockContractId = '507f1f77bcf86cd799439011';
  const mockAccountId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockCustomerId = new Types.ObjectId('507f1f77bcf86cd799439013');
  const mockUserId = '507f1f77bcf86cd799439014';

  const mockCustomer = {
    _id: mockCustomerId,
    name: 'Test Customer',
    email: 'customer@example.com',
    phoneNumber: '1234567890'
  };

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

  const mockContractDocument = {
    ...mockContract,
    toObject: jest.fn().mockReturnValue(mockContract),
    save: jest.fn(),
    populate: jest.fn()
  };

  beforeEach(async () => {
    const mockContractDocument = {
      ...mockContract,
      toObject: jest.fn().mockReturnValue(mockContract),
      save: jest.fn(),
      populate: jest.fn()
    };

    const mockContractModel = jest.fn().mockImplementation((data) => ({
      ...data,
      ...mockContractDocument,
      save: jest.fn().mockResolvedValue({
        ...data,
        ...mockContract,
        toObject: jest.fn().mockReturnValue({ ...data, ...mockContract })
      })
    }));

    // Add static methods
    mockContractModel.find = jest.fn();
    mockContractModel.findById = jest.fn();
    mockContractModel.findOne = jest.fn();
    mockContractModel.findOneAndUpdate = jest.fn();
    mockContractModel.findOneAndDelete = jest.fn();
    mockContractModel.deleteMany = jest.fn();
    mockContractModel.aggregate = jest.fn();

    const mockCustomersService = {
      findByIdAndAccount: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: getModelToken(Contract.name),
          useValue: mockContractModel
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService
        }
      ]
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    contractModel = module.get(getModelToken(Contract.name));
    customersService = module.get(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a contract successfully', async () => {
      const contractData = {
        startDate: new Date('2024-01-01'),
        expireDate: new Date('2024-12-31'),
        status: 'active' as const,
        frequency: 'monthly' as const,
        terms: 'Test contract terms',
        value: 1000,
        customer: mockCustomerId,
        account: mockAccountId,
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      customersService.findByIdAndAccount.mockResolvedValue(mockCustomer as any);
      mockContractDocument.save.mockResolvedValue(mockContract as any);

      const result = await service.create(contractData);

      expect(customersService.findByIdAndAccount).toHaveBeenCalledWith(mockCustomerId, mockAccountId);
      expect(contractModel).toHaveBeenCalledWith(contractData);
      expect(result).toEqual(mockContract);
    });

    it('should throw error when customer not found', async () => {
      const contractData = {
        customer: mockCustomerId,
        account: mockAccountId
      };

      customersService.findByIdAndAccount.mockResolvedValue(null);

      await expect(service.create(contractData)).rejects.toThrow('contracts.customerNotFound');
    });
  });

  describe('findAll', () => {
    it('should return all contracts', async () => {
      const mockContracts = [mockContract];
      contractModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockContracts)
      } as any);

      const result = await service.findAll();

      expect(contractModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockContracts);
    });
  });

  describe('findByAccount', () => {
    it('should return paginated contracts with search', async () => {
      const mockAggregatedContracts = [mockContract];
      const mockCountResult = [{ total: 1 }];

      contractModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockAggregatedContracts)
        } as any)
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockCountResult)
        } as any);

      const result = await service.findByAccount(mockAccountId, 1, 10, 'test', 'active');

      expect(contractModel.aggregate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        contracts: mockAggregatedContracts,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should return paginated contracts without search and status', async () => {
      const mockAggregatedContracts = [mockContract];
      const mockCountResult = [{ total: 1 }];

      contractModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockAggregatedContracts)
        } as any)
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockCountResult)
        } as any);

      const result = await service.findByAccount(mockAccountId, 1, 10, '', undefined);

      expect(contractModel.aggregate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        contracts: mockAggregatedContracts,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should handle empty results', async () => {
      const mockAggregatedContracts = [];
      const mockCountResult = [];

      contractModel.aggregate
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockAggregatedContracts)
        } as any)
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockCountResult)
        } as any);

      const result = await service.findByAccount(mockAccountId, 1, 10, '', undefined);

      expect(result).toEqual({
        contracts: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      });
    });
  });

  describe('findOne', () => {
    it('should return a contract by id', async () => {
      contractModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockContract)
      } as any);

      const result = await service.findOne(mockContractId);

      expect(contractModel.findById).toHaveBeenCalledWith(mockContractId);
      expect(result).toEqual(mockContract);
    });

    it('should return null when contract not found', async () => {
      contractModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.findOne(mockContractId);

      expect(result).toBeNull();
    });
  });

  describe('findByIdAndAccount', () => {
    it('should return contract with populated fields', async () => {
      const populatedContract = {
        ...mockContract,
        account: { name: 'Test Account', id: mockAccountId },
        customer: { name: 'Test Customer', email: 'customer@example.com', phoneNumber: '1234567890' }
      };

      contractModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(populatedContract)
      } as any);

      const result = await service.findByIdAndAccount(mockContractId, mockAccountId);

      expect(contractModel.findOne).toHaveBeenCalledWith({ _id: mockContractId, account: mockAccountId });
      expect(result).toEqual(populatedContract);
    });

    it('should return null when contract not found', async () => {
      contractModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.findByIdAndAccount(mockContractId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('updateByAccount', () => {
    it('should update contract successfully', async () => {
      const updateData = {
        terms: 'Updated terms',
        customer: mockCustomerId.toString(),
        updatedBy: mockUserId
      };

      const updatedContract = { ...mockContract, ...updateData };

      customersService.findByIdAndAccount.mockResolvedValue(mockCustomer as any);
      contractModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedContract)
      } as any);

      const result = await service.updateByAccount(mockContractId, updateData, mockAccountId);

      expect(customersService.findByIdAndAccount).toHaveBeenCalledWith(mockCustomerId.toString(), mockAccountId);
      expect(contractModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockContractId, account: mockAccountId },
        { ...updateData, customer: mockCustomerId },
        { new: true }
      );
      expect(result).toEqual(updatedContract);
    });

    it('should update contract without customer change', async () => {
      const updateData = {
        terms: 'Updated terms',
        updatedBy: mockUserId
      };

      const updatedContract = { ...mockContract, ...updateData };

      contractModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedContract)
      } as any);

      const result = await service.updateByAccount(mockContractId, updateData, mockAccountId);

      expect(customersService.findByIdAndAccount).not.toHaveBeenCalled();
      expect(result).toEqual(updatedContract);
    });

    it('should throw error when customer not found', async () => {
      const updateData = {
        customer: mockCustomerId.toString(),
        updatedBy: mockUserId
      };

      customersService.findByIdAndAccount.mockResolvedValue(null);

      await expect(service.updateByAccount(mockContractId, updateData, mockAccountId)).rejects.toThrow('contracts.customerNotFound');
    });
  });

  describe('deleteByAccount', () => {
    it('should delete contract successfully', async () => {
      contractModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockContract)
      } as any);

      const result = await service.deleteByAccount(mockContractId, mockAccountId);

      expect(contractModel.findOneAndDelete).toHaveBeenCalledWith({ _id: mockContractId, account: mockAccountId });
      expect(result).toEqual(mockContract);
    });

    it('should return null when contract not found', async () => {
      contractModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.deleteByAccount(mockContractId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteAllByAccount', () => {
    it('should delete all contracts for account', async () => {
      const mockDeleteResult = { deletedCount: 5 };
      contractModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDeleteResult)
      } as any);

      const result = await service.deleteAllByAccount(mockAccountId);

      expect(contractModel.deleteMany).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual(mockDeleteResult);
    });
  });
});
