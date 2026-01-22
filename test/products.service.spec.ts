import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductsService } from '../src/products/products.service';
import { Product, ProductDocument } from '../src/products/schemas/product.schema';

describe('ProductsService', () => {
  let service: ProductsService;
  let productModel: any;

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

  beforeEach(async () => {
    const mockProductModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...data,
        _id: new Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: jest.fn().mockReturnValue({
          ...data,
          _id: new Types.ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }),
      populate: jest.fn().mockReturnThis()
    }));

    // Add static methods
    mockProductModel.find = jest.fn();
    mockProductModel.findOne = jest.fn();
    mockProductModel.findOneAndUpdate = jest.fn();
    mockProductModel.findOneAndDelete = jest.fn();
    mockProductModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1)
    });
    mockProductModel.deleteMany = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel
        }
      ]
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productModel = module.get(getModelToken(Product.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const productData = {
        name: 'New Product',
        description: 'New product description',
        maker: 'New Maker',
        model: 'New Model',
        value: 200.0,
        sku: 'NEW-001',
        account: mockAccountId,
        createdBy: mockUserId,
        updatedBy: mockUserId
      };

      const result = await service.create(productData);

      expect(productModel).toHaveBeenCalledWith(productData);
      expect(result).toMatchObject({
        name: 'New Product',
        description: 'New product description',
        maker: 'New Maker',
        model: 'New Model',
        value: 200.0,
        sku: 'NEW-001',
        account: mockAccountId,
        createdBy: mockUserId,
        updatedBy: mockUserId
      });
    });
  });

  describe('findOne', () => {
    it('should return a product by id and account', async () => {
      productModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProduct)
      });

      const result = await service.findOne(mockProduct._id.toString(), mockAccountId);

      expect(productModel.findOne).toHaveBeenCalledWith({
        _id: mockProduct._id.toString(),
        account: mockAccountId
      });
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product not found', async () => {
      productModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.findOne('invalid-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('findByAccount', () => {
    it('should return paginated products without search', async () => {
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProductArray)
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, '');

      expect(productModel.find).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual({
        products: mockProductArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should return paginated products with search', async () => {
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProductArray)
      });

      const result = await service.findByAccount(mockAccountId, 1, 10, 'test');

      expect(productModel.find).toHaveBeenCalledWith({
        account: mockAccountId,
        $or: [
          { name: { $regex: 'test', $options: 'i' } },
          { description: { $regex: 'test', $options: 'i' } },
          { maker: { $regex: 'test', $options: 'i' } },
          { model: { $regex: 'test', $options: 'i' } },
          { sku: { $regex: 'test', $options: 'i' } }
        ]
      });
      expect(result).toEqual({
        products: mockProductArray,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should handle pagination correctly', async () => {
      productModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProductArray)
      });

      const result = await service.findByAccount(mockAccountId, 2, 5, '');

      expect(result).toEqual({
        products: mockProductArray,
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1
      });
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const updateData = {
        name: 'Updated Product',
        value: 150.0,
        updatedBy: mockUserId
      };

      productModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...mockProduct,
          ...updateData
        })
      });

      const result = await service.update(mockProduct._id.toString(), updateData, mockAccountId);

      expect(productModel.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockProduct._id.toString(), account: mockAccountId }, updateData, { new: true });
      expect(result).toMatchObject({
        ...mockProduct,
        ...updateData
      });
    });

    it('should return null when product not found', async () => {
      productModel.findOneAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.update('invalid-id', { name: 'Updated' }, mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a product with account scoping', async () => {
      productModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct)
      });

      const result = await service.delete(mockProduct._id.toString(), mockAccountId);

      expect(productModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockProduct._id.toString(),
        account: mockAccountId
      });
      expect(result).toEqual(mockProduct);
    });

    it('should delete a product without account scoping', async () => {
      productModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct)
      });

      const result = await service.delete(mockProduct._id.toString());

      expect(productModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockProduct._id.toString()
      });
      expect(result).toEqual(mockProduct);
    });

    it('should return null when product not found', async () => {
      productModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.delete('invalid-id', mockAccountId);

      expect(result).toBeNull();
    });
  });

  describe('deleteAllByAccount', () => {
    it('should delete all products for an account', async () => {
      const mockDeleteResult = { deletedCount: 5 };
      productModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDeleteResult)
      });

      const result = await service.deleteAllByAccount(mockAccountId);

      expect(productModel.deleteMany).toHaveBeenCalledWith({ account: mockAccountId });
      expect(result).toEqual(mockDeleteResult);
    });
  });
});
