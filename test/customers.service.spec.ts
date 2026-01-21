import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { CustomersService } from '../src/customers/customers.service';
import { Customer, CustomerDocument } from '../src/customers/schemas/customer.schema';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerModel: jest.Mocked<Model<CustomerDocument>>;

  const mockCustomerId = '507f1f77bcf86cd799439011';
  const mockAccountId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockTechnicianId = new Types.ObjectId('507f1f77bcf86cd799439013');
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
    account: mockAccountId,
    address: {
      street: 'Test Street',
      number: '123',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Brazil'
    },
    equipments: [
      {
        name: 'AC Unit',
        room: 'Living Room',
        btus: 12000,
        type: 'Air Conditioner',
        maker: 'Test Maker',
        model: 'Test Model'
      }
    ],
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockCustomerDocument = {
    ...mockCustomer,
    toObject: jest.fn().mockReturnValue(mockCustomer),
    save: jest.fn(),
    populate: jest.fn()
  };

  beforeEach(async () => {
    const mockCustomerModel = jest.fn().mockImplementation((data) => ({
      ...data,
      ...mockCustomerDocument,
      save: jest.fn().mockResolvedValue({
        ...data,
        ...mockCustomer,
        toObject: jest.fn().mockReturnValue({ ...data, ...mockCustomer })
      })
    }));

    // Add static methods
    mockCustomerModel.find = jest.fn();
    mockCustomerModel.findById = jest.fn();
    mockCustomerModel.findOne = jest.fn();
    mockCustomerModel.findOneAndUpdate = jest.fn();
    mockCustomerModel.findOneAndDelete = jest.fn();
    mockCustomerModel.deleteMany = jest.fn();
    mockCustomerModel.countDocuments = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getModelToken(Customer.name),
          useValue: mockCustomerModel
        }
      ]
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    customerModel = module.get(getModelToken(Customer.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a residential customer successfully', async () => {
      const customerData = {
        name: 'Test Customer',
        email: 'customer@example.com',
        type: 'residential' as const,
        cpf: '12345678901',
        phoneNumbers: ['1234567890'],
        address: {
          street: 'Test Street',
          number: '123',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345'
        },
        equipments: [
          {
            name: 'AC Unit',
            room: 'Living Room',
            btus: 12000,
            type: 'Air Conditioner',
            maker: 'Test Maker',
            model: 'Test Model'
          }
        ],
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      const result = await service.create(customerData, mockAccountId);

      expect(customerModel).toHaveBeenCalledWith({
        ...customerData,
        address: {
          ...customerData.address,
          country: 'Brazil'
        },
        equipments: customerData.equipments,
        account: mockAccountId
      });
      expect(result).toBeDefined();
    });

    it('should create a commercial customer successfully', async () => {
      const customerData = {
        name: 'Commercial Customer',
        email: 'commercial@example.com',
        type: 'commercial' as const,
        cnpj: '12345678000123',
        contactName: 'John Doe',
        phoneNumbers: ['1234567890'],
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      const result = await service.create(customerData, mockAccountId);

      expect(customerModel).toHaveBeenCalledWith({
        ...customerData,
        cpf: undefined,
        cnpj: '12345678000123',
        contactName: 'John Doe',
        address: undefined,
        equipments: [],
        account: mockAccountId
      });
      expect(result).toBeDefined();
    });

    it('should create customer with default values', async () => {
      const customerData = {
        name: 'Minimal Customer',
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      const result = await service.create(customerData, mockAccountId);

      expect(customerModel).toHaveBeenCalledWith({
        ...customerData,
        type: 'residential',
        cpf: undefined,
        cnpj: undefined,
        contactName: undefined,
        address: undefined,
        equipments: [],
        account: mockAccountId
      });
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all customers', async () => {
      const mockCustomers = [mockCustomer];
      customerModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomers)
      } as any);

      const result = await service.findAll();

      expect(customerModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockCustomers);
    });
  });

  describe('findByAccount', () => {
    it('should return paginated customers with search', async () => {
      const mockCustomers = [mockCustomer];
      const mockCount = 1;

      customerModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockCustomers)
      } as any);

      customerModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCount)
      } as any);

      const result = await service.findByAccount(mockAccountId, 1, 10, 'test', 'active');

      expect(customerModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        $or: [
          { name: { $regex: 'test', $options: 'i' } },
          { email: { $regex: 'test', $options: 'i' } },
          { cpf: { $regex: 'test', $options: 'i' } },
          { phoneNumbers: { $elemMatch: { $regex: 'test', $options: 'i' } } }
        ],
        status: 'active'
      });
      expect(result).toEqual({
        customers: mockCustomers,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should return paginated customers without search and status', async () => {
      const mockCustomers = [mockCustomer];
      const mockCount = 1;

      customerModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockCustomers)
      } as any);

      customerModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCount)
      } as any);

      const result = await service.findByAccount(mockAccountId, 1, 10, '', undefined);

      expect(customerModel.find).toHaveBeenCalledWith({
        account: mockAccountId
      });
      expect(result).toEqual({
        customers: mockCustomers,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should handle empty results', async () => {
      const mockCustomers = [];
      const mockCount = 0;

      customerModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockCustomers)
      } as any);

      customerModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCount)
      } as any);

      const result = await service.findByAccount(mockAccountId, 1, 10, '', undefined);

      expect(result).toEqual({
        customers: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      });
    });
  });

  describe('findByIdAndAccount', () => {
    it('should return customer with populated fields', async () => {
      const populatedCustomer = {
        ...mockCustomer,
        account: { name: 'Test Account', id: mockAccountId }
      };

      customerModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(populatedCustomer)
      } as any);

      const result = await service.findByIdAndAccount(mockCustomerId, mockAccountId);

      expect(customerModel.findOne).toHaveBeenCalledWith({ _id: mockCustomerId, account: mockAccountId });
      expect(result).toEqual(populatedCustomer);
    });

    it('should return null when customer not found', async () => {
      customerModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.findByIdAndAccount(mockCustomerId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('updateByAccount', () => {
    it('should update customer successfully', async () => {
      const updateData = {
        name: 'Updated Customer',
        email: 'updated@example.com',
        address: {
          street: 'Updated Street',
          city: 'Updated City'
        },
        equipments: [
          {
            name: 'Updated Equipment',
            type: 'Updated Type'
          }
        ],
        updatedBy: mockUserId
      };

      const updatedCustomer = { ...mockCustomer, ...updateData };

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.updateByAccount(mockCustomerId, updateData, mockAccountId);

      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockCustomerId, account: mockAccountId },
        {
          ...updateData,
          address: {
            ...updateData.address,
            country: 'Brazil'
          }
        },
        { new: true }
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should update customer without address change', async () => {
      const updateData = {
        name: 'Updated Customer',
        updatedBy: mockUserId
      };

      const updatedCustomer = { ...mockCustomer, ...updateData };

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.updateByAccount(mockCustomerId, updateData, mockAccountId);

      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockCustomerId, account: mockAccountId }, updateData, { new: true });
      expect(result).toEqual(updatedCustomer);
    });
  });

  describe('deleteByAccount', () => {
    it('should delete customer successfully', async () => {
      customerModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomer)
      } as any);

      const result = await service.deleteByAccount(mockCustomerId, mockAccountId);

      expect(customerModel.findOneAndDelete).toHaveBeenCalledWith({ _id: mockCustomerId, account: mockAccountId });
      expect(result).toEqual(mockCustomer);
    });

    it('should return null when customer not found', async () => {
      customerModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.deleteByAccount(mockCustomerId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteAllByAccount', () => {
    it('should delete all customers for account', async () => {
      const mockDeleteResult = { deletedCount: 5 };
      customerModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDeleteResult)
      } as any);

      const result = await service.deleteAllByAccount(mockAccountId);

      expect(customerModel.deleteMany).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual(mockDeleteResult);
    });
  });
});
