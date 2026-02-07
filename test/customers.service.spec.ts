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
          { cnpj: { $regex: 'test', $options: 'i' } },
          { phoneNumbers: { $elemMatch: { $regex: 'test', $options: 'i' } } },
          { 'address.street': { $regex: 'test', $options: 'i' } },
          { 'address.number': { $regex: 'test', $options: 'i' } },
          { 'address.complement': { $regex: 'test', $options: 'i' } },
          { 'address.neighborhood': { $regex: 'test', $options: 'i' } },
          { 'address.city': { $regex: 'test', $options: 'i' } },
          { 'address.state': { $regex: 'test', $options: 'i' } },
          { 'address.zipCode': { $regex: 'test', $options: 'i' } }
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

      // Mock findOne to return existing customer with pictures
      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockCustomer,
          equipments: [
            {
              _id: 'equipment1',
              name: 'AC Unit',
              room: 'Living Room',
              btus: 12000,
              type: 'Air Conditioner',
              maker: 'Test Maker',
              model: 'Test Model',
              pictures: ['/uploads/equipment-pictures/pic1.jpg', '/uploads/equipment-pictures/pic2.jpg']
            }
          ]
        })
      } as any);

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.updateByAccount(mockCustomerId, updateData, mockAccountId);

      expect(customerModel.findOne).toHaveBeenCalledWith({ _id: mockCustomerId, account: mockAccountId });
      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockCustomerId, account: mockAccountId },
        {
          ...updateData,
          address: {
            ...updateData.address,
            country: 'Brazil'
          },
          equipments: [
            {
              name: 'Updated Equipment',
              type: 'Updated Type',
              pictures: ['/uploads/equipment-pictures/pic1.jpg', '/uploads/equipment-pictures/pic2.jpg'] // Pictures preserved
            }
          ]
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

      // Mock findOne to return existing customer
      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomer)
      } as any);

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.updateByAccount(mockCustomerId, updateData, mockAccountId);

      expect(customerModel.findOne).toHaveBeenCalledWith({ _id: mockCustomerId, account: mockAccountId });
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

  describe('addNote', () => {
    it('should add a note to customer successfully', async () => {
      const noteData = { content: 'Test note content' };
      const updatedCustomer = {
        ...mockCustomer,
        noteHistory: [
          {
            date: expect.any(Date),
            content: noteData.content,
            createdBy: new Types.ObjectId(mockUserId)
          }
        ]
      };

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.addNote(mockCustomerId, noteData, mockUserId, mockAccountId);

      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockCustomerId, account: mockAccountId },
        {
          $push: {
            noteHistory: {
              date: expect.any(Date),
              content: noteData.content,
              createdBy: new Types.ObjectId(mockUserId)
            }
          }
        },
        { new: true }
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer not found', async () => {
      const noteData = { content: 'Test note content' };

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.addNote(mockCustomerId, noteData, mockUserId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('updateNote', () => {
    it('should update a note successfully', async () => {
      const noteId = '507f1f77bcf86cd799439015'; // Valid ObjectId string
      const noteData = { content: 'Updated note content' };
      const updatedCustomer = {
        ...mockCustomer,
        noteHistory: [
          {
            _id: new Types.ObjectId(noteId),
            date: expect.any(Date),
            content: noteData.content,
            createdBy: new Types.ObjectId(mockUserId)
          }
        ]
      };

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.updateNote(mockCustomerId, noteId, noteData, mockUserId, mockAccountId);

      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockCustomerId, account: mockAccountId, 'noteHistory._id': new Types.ObjectId(noteId) },
        {
          $set: {
            'noteHistory.$.content': noteData.content,
            'noteHistory.$.date': expect.any(Date),
            'noteHistory.$.createdBy': new Types.ObjectId(mockUserId)
          }
        },
        { new: true }
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer or note not found', async () => {
      const noteId = '507f1f77bcf86cd799439015'; // Valid ObjectId string
      const noteData = { content: 'Updated note content' };

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.updateNote(mockCustomerId, noteId, noteData, mockUserId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteNote', () => {
    it('should delete a note successfully', async () => {
      const noteId = '507f1f77bcf86cd799439015'; // Valid ObjectId string
      const updatedCustomer = {
        ...mockCustomer,
        noteHistory: [] // Note removed
      };

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.deleteNote(mockCustomerId, noteId, mockUserId, mockAccountId);

      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockCustomerId, account: mockAccountId },
        {
          $pull: {
            noteHistory: { _id: new Types.ObjectId(noteId) }
          }
        },
        { new: true }
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer not found', async () => {
      const noteId = '507f1f77bcf86cd799439015'; // Valid ObjectId string

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.deleteNote(mockCustomerId, noteId, mockUserId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('addEquipmentPicture', () => {
    it('should add picture to equipment successfully', async () => {
      const equipmentId = '507f1f77bcf86cd799439016'; // Valid ObjectId string
      const pictureUrls = ['/uploads/equipment-pictures/pic1.jpg'];
      const mockCustomerWithEquipment = {
        ...mockCustomer,
        equipments: [
          {
            _id: new Types.ObjectId(equipmentId),
            name: 'AC Unit',
            room: 'Living Room',
            btus: 12000,
            type: 'Air Conditioner',
            maker: 'Test Maker',
            model: 'Test Model'
          }
        ]
      };

      const updatedCustomer = {
        ...mockCustomerWithEquipment,
        equipments: [
          {
            ...mockCustomerWithEquipment.equipments[0],
            pictures: pictureUrls
          }
        ]
      };

      // Mock findOne to return customer with equipment
      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomerWithEquipment)
      } as any);

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.addEquipmentPicture(mockCustomerId, equipmentId, pictureUrls, mockAccountId);

      expect(customerModel.findOne).toHaveBeenCalledWith({ _id: mockCustomerId, account: mockAccountId });
      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockCustomerId, account: mockAccountId },
        {
          $push: {
            [`equipments.$[elem].pictures`]: { $each: pictureUrls }
          }
        },
        {
          new: true,
          arrayFilters: [{ 'elem._id': new Types.ObjectId(equipmentId) }]
        }
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should add multiple pictures to equipment', async () => {
      const equipmentId = '507f1f77bcf86cd799439016'; // Valid ObjectId string
      const pictureUrls = ['/uploads/equipment-pictures/pic1.jpg', '/uploads/equipment-pictures/pic2.jpg'];
      const mockCustomerWithEquipment = {
        ...mockCustomer,
        equipments: [
          {
            _id: new Types.ObjectId(equipmentId),
            name: 'AC Unit',
            room: 'Living Room',
            btus: 12000,
            type: 'Air Conditioner',
            maker: 'Test Maker',
            model: 'Test Model'
          }
        ]
      };

      const updatedCustomer = {
        ...mockCustomerWithEquipment,
        equipments: [
          {
            ...mockCustomerWithEquipment.equipments[0],
            pictures: pictureUrls
          }
        ]
      };

      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomerWithEquipment)
      } as any);

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.addEquipmentPicture(mockCustomerId, equipmentId, pictureUrls, mockAccountId);

      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockCustomerId, account: mockAccountId },
        {
          $push: {
            [`equipments.$[elem].pictures`]: { $each: pictureUrls }
          }
        },
        {
          new: true,
          arrayFilters: [{ 'elem._id': new Types.ObjectId(equipmentId) }]
        }
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should handle single picture URL as string', async () => {
      const equipmentId = '507f1f77bcf86cd799439016'; // Valid ObjectId string
      const pictureUrl = '/uploads/equipment-pictures/pic1.jpg';
      const mockCustomerWithEquipment = {
        ...mockCustomer,
        equipments: [
          {
            _id: new Types.ObjectId(equipmentId),
            name: 'AC Unit',
            room: 'Living Room',
            btus: 12000,
            type: 'Air Conditioner',
            maker: 'Test Maker',
            model: 'Test Model'
          }
        ]
      };

      const updatedCustomer = {
        ...mockCustomerWithEquipment,
        equipments: [
          {
            ...mockCustomerWithEquipment.equipments[0],
            pictures: [pictureUrl]
          }
        ]
      };

      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCustomerWithEquipment)
      } as any);

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.addEquipmentPicture(mockCustomerId, equipmentId, pictureUrl, mockAccountId);

      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockCustomerId, account: mockAccountId },
        {
          $push: {
            [`equipments.$[elem].pictures`]: { $each: [pictureUrl] }
          }
        },
        {
          new: true,
          arrayFilters: [{ 'elem._id': new Types.ObjectId(equipmentId) }]
        }
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer not found', async () => {
      const equipmentId = '507f1f77bcf86cd799439016'; // Valid ObjectId string
      const pictureUrls = ['/uploads/equipment-pictures/pic1.jpg'];

      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.addEquipmentPicture(mockCustomerId, equipmentId, pictureUrls, mockAccountId);

      expect(result).toBeNull();
    });

    it('should return null when equipment not found', async () => {
      const equipmentId = '507f1f77bcf86cd799439016'; // Valid ObjectId string
      const pictureUrls = ['/uploads/equipment-pictures/pic1.jpg'];

      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockCustomer,
          equipments: [] // Customer exists but has no equipments
        })
      } as any);

      const result = await service.addEquipmentPicture(mockCustomerId, equipmentId, pictureUrls, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('addCustomerPicture', () => {
    it('should add picture to customer successfully', async () => {
      const pictureUrl = '/uploads/customer-pictures/pic1.jpg';
      const updatedCustomer = {
        ...mockCustomer,
        pictures: [
          {
            url: pictureUrl,
            createdDate: expect.any(Date),
            createdBy: new Types.ObjectId(mockUserId)
          }
        ]
      };

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.addCustomerPicture(mockCustomerId, pictureUrl, mockUserId, mockAccountId);

      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockCustomerId, account: mockAccountId },
        {
          $push: {
            pictures: {
              url: pictureUrl,
              createdDate: expect.any(Date),
              createdBy: new Types.ObjectId(mockUserId)
            }
          }
        },
        { new: true }
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer not found', async () => {
      const pictureUrl = '/uploads/customer-pictures/pic1.jpg';

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.addCustomerPicture(mockCustomerId, pictureUrl, mockUserId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteCustomerPicture', () => {
    it('should delete customer picture successfully', async () => {
      const pictureId = '507f1f77bcf86cd799439017'; // Valid ObjectId string
      const pictureUrl = '/uploads/customer-pictures/test.jpg';
      const customerWithPicture = {
        ...mockCustomer,
        pictures: [
          {
            _id: new Types.ObjectId(pictureId),
            url: pictureUrl,
            createdDate: new Date(),
            createdBy: new Types.ObjectId(mockUserId)
          }
        ]
      };
      const updatedCustomer = {
        ...mockCustomer,
        pictures: [] // Picture removed
      };

      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(customerWithPicture)
      } as any);

      customerModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedCustomer)
      } as any);

      const result = await service.deleteCustomerPicture(mockCustomerId, pictureId, mockAccountId);

      expect(customerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: mockCustomerId, account: mockAccountId },
        {
          $pull: {
            pictures: { _id: new Types.ObjectId(pictureId) }
          }
        },
        { new: true }
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer not found', async () => {
      const pictureId = '507f1f77bcf86cd799439017'; // Valid ObjectId string

      customerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      } as any);

      const result = await service.deleteCustomerPicture(mockCustomerId, pictureId, mockAccountId);

      expect(result).toBeNull();
    });
  });
});
