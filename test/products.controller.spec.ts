import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Types } from 'mongoose';
import { CreateProductDto } from '../src/products/dto/create-product.dto';
import { UpdateProductDto } from '../src/products/dto/update-product.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockAccountId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();

  const mockProduct = {
    _id: new Types.ObjectId(),
    name: 'Test Product',
    description: 'A test product',
    maker: 'Test Maker',
    model: 'Test Model',
    value: 100.5,
    sku: 'TEST-001',
    account: mockAccountId,
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockProductArray = [mockProduct];

  const mockProductsService = {
    create: jest.fn(),
    findByAccount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'New Product',
        description: 'New product description',
        maker: 'New Maker',
        model: 'New Model',
        value: 200.0,
        sku: 'NEW-001'
      };

      const expectedProductData = {
        ...createProductDto,
        account: mockAccountId,
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      mockProductsService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createProductDto, mockAccountId, mockUserId);

      expect(mockProductsService.create).toHaveBeenCalledWith(expectedProductData);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return paginated products with default parameters', async () => {
      const mockResult = {
        products: mockProductArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      mockProductsService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('1', '10', '', mockAccountId);

      expect(mockProductsService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '');
      expect(result).toEqual(mockResult);
    });

    it('should return paginated products with custom parameters', async () => {
      const mockResult = {
        products: mockProductArray,
        total: 1,
        page: 2,
        limit: 20,
        totalPages: 1
      };
      mockProductsService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('2', '20', 'search term', mockAccountId);

      expect(mockProductsService.findByAccount).toHaveBeenCalledWith(mockAccountId, 2, 20, 'search term');
      expect(result).toEqual(mockResult);
    });

    it('should handle invalid page and limit parameters', async () => {
      const mockResult = {
        products: mockProductArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      mockProductsService.findByAccount.mockResolvedValue(mockResult);

      const result = await controller.findAll('invalid', 'invalid', '', mockAccountId);

      expect(mockProductsService.findByAccount).toHaveBeenCalledWith(mockAccountId, 1, 10, '');
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne(mockProduct._id.toString(), mockAccountId);

      expect(mockProductsService.findOne).toHaveBeenCalledWith(mockProduct._id.toString(), mockAccountId);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateProductDto: UpdateProductDto = {
        name: 'Updated Product',
        value: 150.0
      };

      const expectedProductData = {
        ...updateProductDto,
        updatedBy: mockUserId
      };

      mockProductsService.update.mockResolvedValue({
        ...mockProduct,
        ...updateProductDto
      });

      const result = await controller.update(mockProduct._id.toString(), updateProductDto, mockAccountId, mockUserId);

      expect(mockProductsService.update).toHaveBeenCalledWith(mockProduct._id.toString(), expectedProductData, mockAccountId);
      expect(result).toMatchObject({
        ...mockProduct,
        ...updateProductDto
      });
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      mockProductsService.delete.mockResolvedValue(mockProduct);

      const result = await controller.remove(mockProduct._id.toString(), mockAccountId);

      expect(mockProductsService.delete).toHaveBeenCalledWith(mockProduct._id.toString(), mockAccountId);
      expect(result).toEqual(mockProduct);
    });
  });
});
