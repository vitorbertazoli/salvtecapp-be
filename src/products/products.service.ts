import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async create(productData: Partial<Product>): Promise<Product> {
    const createdProduct = new this.productModel(productData);
    return createdProduct.save();
  }

  async findOne(id: string, accountId: Types.ObjectId): Promise<Product | null> {
    const query = { _id: id, account: accountId };
    return this.productModel.findOne(query).populate('account').exec();
  }

  async findByAccount(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = ''
  ): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery: any = { account: accountId };
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { maker: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const [products, total] = await Promise.all([
      this.productModel
        .find(searchQuery)
        .populate('account')
        .sort({ createdAt: -1 }) // Sort by creation date, newest first
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(searchQuery).exec()
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      products,
      total,
      page,
      limit,
      totalPages
    };
  }

  async update(id: string, productData: Partial<Product>, accountId: Types.ObjectId): Promise<Product | null> {
    const query = { _id: id, account: accountId };
    return this.productModel.findOneAndUpdate(query, productData, { new: true }).populate('account').exec();
  }

  async delete(id: string, accountId?: Types.ObjectId): Promise<Product | null> {
    const query = accountId ? { _id: id, account: accountId } : { _id: id };
    return this.productModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.productModel.deleteMany({ account: accountId }).exec();
  }
}
