// Mock file system and image processing dependencies
const mockRename = jest.fn().mockResolvedValue(undefined);

jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({ width: 800, height: 600 }),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock fs operations
jest.mock('fs', () => ({
  promises: {
    rename: mockRename
  }
}));

// Mock multer storage to avoid directory creation
jest.mock('multer', () => {
  const multerMock = jest.fn(() => ({
    single: jest.fn(),
    array: jest.fn(),
    fields: jest.fn(),
    none: jest.fn(),
    any: jest.fn()
  }));

  multerMock.diskStorage = jest.fn(() => ({}));
  multerMock.memoryStorage = jest.fn(() => ({}));

  return multerMock;
});

// Mock mkdirp to avoid directory creation issues
jest.mock('mkdirp', () => ({
  sync: jest.fn()
}));

import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { CustomersController } from '../src/customers/customers.controller';
import { CustomersService } from '../src/customers/customers.service';
import { AddNoteDto } from '../src/customers/dto/add-note.dto';
import { CreateCustomerDto } from '../src/customers/dto/create-customer.dto';
import { UpdateCustomerDto } from '../src/customers/dto/update-customer.dto';

describe('CustomersController', () => {
  let controller: CustomersController;
  let customersService: jest.Mocked<CustomersService>;

  const mockCustomerId = '507f1f77bcf86cd799439011';
  const mockAccountId = new Types.ObjectId('507f1f77bcf86cd799439012');
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

  const mockPaginatedResult = {
    customers: [mockCustomer],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1
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
      addNote: jest.fn(),
      updateNote: jest.fn(),
      deleteNote: jest.fn(),
      addEquipmentPicture: jest.fn(),
      addCustomerPicture: jest.fn(),
      deleteCustomerPicture: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockCustomersService
        }
      ]
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
        ]
      };

      customersService.create.mockResolvedValue(mockCustomer as any);

      const result = await controller.create(createDto, mockUserId, mockAccountId);

      expect(customersService.create).toHaveBeenCalledWith(
        {
          ...createDto,
          account: mockAccountId,
          createdBy: new Types.ObjectId(mockUserId),
          updatedBy: new Types.ObjectId(mockUserId)
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
        cpf: '12345678901'
      };

      customersService.create.mockResolvedValue(mockCustomer as any);

      const result = await controller.create(createDto, mockUserId, mockAccountId);

      expect(customersService.create).toHaveBeenCalledWith(
        {
          ...createDto,
          account: mockAccountId,
          createdBy: new Types.ObjectId(mockUserId),
          updatedBy: new Types.ObjectId(mockUserId)
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
        address: {
          street: 'Updated Street',
          city: 'Updated City'
        },
        equipments: [
          {
            name: 'Updated Equipment',
            type: 'Updated Type'
          }
        ]
      };

      const updatedCustomer = { ...mockCustomer, ...updateDto };
      customersService.updateByAccount.mockResolvedValue(updatedCustomer as any);

      const result = await controller.update(mockCustomerId, updateDto, mockUserId, mockAccountId);

      expect(customersService.updateByAccount).toHaveBeenCalledWith(
        mockCustomerId,
        {
          ...updateDto,
          updatedBy: new Types.ObjectId(mockUserId)
        },
        mockAccountId
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should update customer without technician change', async () => {
      const updateDto: UpdateCustomerDto = {
        name: 'Updated Customer',
        email: 'updated@example.com'
      };

      const updatedCustomer = { ...mockCustomer, ...updateDto };
      customersService.updateByAccount.mockResolvedValue(updatedCustomer as any);

      const result = await controller.update(mockCustomerId, updateDto, mockUserId, mockAccountId);

      expect(customersService.updateByAccount).toHaveBeenCalledWith(
        mockCustomerId,
        {
          ...updateDto,
          updatedBy: new Types.ObjectId(mockUserId)
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

  describe('addNote', () => {
    it('should add a note to customer successfully', async () => {
      const dto: AddNoteDto = { content: 'Test note content' };
      const updatedCustomer = {
        ...mockCustomer,
        noteHistory: [
          {
            date: expect.any(Date),
            content: dto.content,
            createdBy: new Types.ObjectId(mockUserId)
          }
        ]
      };

      customersService.addNote.mockResolvedValue(updatedCustomer as any);

      const result = await controller.addNote(mockCustomerId, dto, mockUserId, mockAccountId);

      expect(customersService.addNote).toHaveBeenCalledWith(mockCustomerId, dto, mockUserId, mockAccountId);
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer not found', async () => {
      const dto: AddNoteDto = { content: 'Test note content' };

      customersService.addNote.mockResolvedValue(null);

      const result = await controller.addNote(mockCustomerId, dto, mockUserId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('updateNote', () => {
    it('should update a note successfully', async () => {
      const noteId = '507f1f77bcf86cd799439015'; // Valid ObjectId string
      const dto: AddNoteDto = { content: 'Updated note content' };
      const updatedCustomer = {
        ...mockCustomer,
        noteHistory: [
          {
            _id: new Types.ObjectId(noteId),
            date: expect.any(Date),
            content: dto.content,
            createdBy: new Types.ObjectId(mockUserId)
          }
        ]
      };

      customersService.updateNote.mockResolvedValue(updatedCustomer as any);

      const result = await controller.updateNote(mockCustomerId, noteId, dto, mockUserId, mockAccountId);

      expect(customersService.updateNote).toHaveBeenCalledWith(mockCustomerId, noteId, dto, mockUserId, mockAccountId);
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer or note not found', async () => {
      const noteId = '507f1f77bcf86cd799439015'; // Valid ObjectId string
      const dto: AddNoteDto = { content: 'Updated note content' };

      customersService.updateNote.mockResolvedValue(null);

      const result = await controller.updateNote(mockCustomerId, noteId, dto, mockUserId, mockAccountId);

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

      customersService.deleteNote.mockResolvedValue(updatedCustomer as any);

      const result = await controller.deleteNote(mockCustomerId, noteId, mockUserId, mockAccountId);

      expect(customersService.deleteNote).toHaveBeenCalledWith(mockCustomerId, noteId, mockUserId, mockAccountId);
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer not found', async () => {
      const noteId = '507f1f77bcf86cd799439015'; // Valid ObjectId string

      customersService.deleteNote.mockResolvedValue(null);

      const result = await controller.deleteNote(mockCustomerId, noteId, mockUserId, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('uploadEquipmentPicture', () => {
    it('should upload equipment picture successfully', async () => {
      const equipmentId = '507f1f77bcf86cd799439016'; // Valid ObjectId string
      const mockFile = {
        filename: 'equipment-test-equipment123-123456789.jpg',
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024000
      } as Express.Multer.File;

      const updatedCustomer = {
        ...mockCustomer,
        equipments: [
          {
            _id: new Types.ObjectId(equipmentId),
            name: 'AC Unit',
            room: 'Living Room',
            btus: 12000,
            type: 'Air Conditioner',
            maker: 'Test Maker',
            model: 'Test Model',
            pictures: [`/uploads/equipment-pictures/${mockFile.filename}`]
          }
        ]
      };

      customersService.addEquipmentPicture.mockResolvedValue(updatedCustomer as any);

      const result = await controller.uploadEquipmentPicture(mockCustomerId, equipmentId, mockFile, mockAccountId, { id: mockUserId });

      expect(customersService.addEquipmentPicture).toHaveBeenCalledWith(
        mockCustomerId,
        equipmentId,
        [`/uploads/equipment-pictures/${mockFile.filename}`],
        mockAccountId
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should throw BadRequestException when no file uploaded', async () => {
      const equipmentId = '507f1f77bcf86cd799439016'; // Valid ObjectId string

      await expect(controller.uploadEquipmentPicture(mockCustomerId, equipmentId, null as any, mockAccountId, { id: mockUserId })).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('uploadCustomerPicture', () => {
    it('should upload customer picture successfully', async () => {
      const mockFile = {
        filename: 'customer-test-123456789.jpg',
        mimetype: 'image/jpeg',
        originalname: 'test.jpg'
      } as Express.Multer.File;

      const expectedPictureUrl = `/uploads/customer-pictures/${mockFile.filename}`;
      const updatedCustomer = {
        ...mockCustomer,
        pictures: [
          {
            url: expectedPictureUrl,
            createdDate: expect.any(Date),
            createdBy: new Types.ObjectId(mockUserId)
          }
        ]
      };

      customersService.addCustomerPicture.mockResolvedValue(updatedCustomer);

      const result = await controller.uploadCustomerPicture(mockCustomerId, mockFile, mockAccountId, mockUserId);

      expect(customersService.addCustomerPicture).toHaveBeenCalledWith(
        mockCustomerId,
        expectedPictureUrl,
        mockUserId,
        mockAccountId
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should throw BadRequestException when no file uploaded', async () => {
      await expect(controller.uploadCustomerPicture(mockCustomerId, null as any, mockAccountId, mockUserId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('deleteCustomerPicture', () => {
    it('should delete customer picture successfully', async () => {
      const pictureId = '507f1f77bcf86cd799439017'; // Valid ObjectId string
      const updatedCustomer = {
        ...mockCustomer,
        pictures: [] // Picture removed
      };

      customersService.deleteCustomerPicture.mockResolvedValue(updatedCustomer as any);

      const result = await controller.deleteCustomerPicture(mockCustomerId, pictureId, mockAccountId);

      expect(customersService.deleteCustomerPicture).toHaveBeenCalledWith(mockCustomerId, pictureId, mockAccountId);
      expect(result).toEqual(updatedCustomer);
    });

    it('should return null when customer not found', async () => {
      const pictureId = '507f1f77bcf86cd799439017'; // Valid ObjectId string

      customersService.deleteCustomerPicture.mockResolvedValue(null);

      const result = await controller.deleteCustomerPicture(mockCustomerId, pictureId, mockAccountId);

      expect(result).toBeNull();
    });
  });
});