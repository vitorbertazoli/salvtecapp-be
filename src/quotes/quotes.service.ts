import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quote, QuoteDocument } from './schemas/quote.schema';

@Injectable()
export class QuotesService {
  constructor(@InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>) {}

  async create(quoteData: Partial<Quote>): Promise<Quote> {
    const createdQuote = new this.quoteModel(quoteData);
    const savedQuote = await createdQuote.save();
    return savedQuote.toObject() as any;
  }

  async findAll(): Promise<Quote[]> {
    return this.quoteModel.find().exec();
  }

  async findByAccount(
    accountId: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: string
  ): Promise<{
    quotes: Quote[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions: any = { account: new Types.ObjectId(accountId) };
    if (status) {
      matchConditions.status = status;
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchConditions },
      // Join with customers collection
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ];

    // Add search filter if search term is provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [{ description: { $regex: search, $options: 'i' } }, { 'customer.name': { $regex: search, $options: 'i' } }]
        }
      });
    }

    // Add sorting, pagination
    pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit });

    // Get total count
    let total: number;
    if (!search) {
      total = await this.quoteModel.countDocuments(matchConditions).exec();
    } else {
      const countPipeline = [...pipeline];
      countPipeline.splice(countPipeline.length - 2, 2, { $count: 'total' });
      const countResult = await this.quoteModel.aggregate(countPipeline).exec();
      total = countResult.length > 0 ? countResult[0].total : 0;
    }

    const quotes = await this.quoteModel.aggregate(pipeline).exec();

    const totalPages = Math.ceil(total / limit);

    return {
      quotes,
      total,
      page,
      limit,
      totalPages
    };
  }

  async findOne(id: string): Promise<Quote | null> {
    return this.quoteModel.findById(id).exec();
  }

  async findByIdAndAccount(id: string, accountId: string): Promise<QuoteDocument | null> {
    const quote = await this.quoteModel
      .findOne({ _id: id, account: new Types.ObjectId(accountId) })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .populate('services.service', 'name')
      .populate('products.product', 'name')
      .exec();

    return quote;
  }

  async update(id: string, quoteData: Partial<Quote>): Promise<Quote | null> {
    // Check current quote status
    const currentQuote = await this.quoteModel.findById(id).exec();
    if (!currentQuote) {
      return null;
    }

    // If quote has been sent or accepted, reset status to draft when updating
    // But allow status change from 'sent' to 'accepted' (for service order creation)
    const updateData = { ...quoteData };
    if (currentQuote.status === 'sent' || currentQuote.status === 'accepted') {
      // Allow status change from 'sent' to 'accepted', but reset to 'draft' for other updates
      if (!(quoteData.status === 'accepted' && currentQuote.status === 'sent')) {
        updateData.status = 'draft';
      }
    }

    return this.quoteModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async updateByAccount(id: string, quoteData: Partial<Quote>, accountId: string): Promise<Quote | null> {
    const query = { _id: id, account: new Types.ObjectId(accountId) };

    // Check current quote status
    const currentQuote = await this.quoteModel.findOne(query).exec();
    if (!currentQuote) {
      return null;
    }

    // If quote has been sent or accepted, reset status to draft when updating
    // But allow status changes from 'sent' to 'accepted' (for service order creation)
    const updateData = { ...quoteData };
    if (currentQuote.status === 'sent' || currentQuote.status === 'accepted') {
      // Allow status change from 'sent' to 'accepted', but reset to 'draft' for other updates
      if (!(quoteData.status === 'accepted' && currentQuote.status === 'sent')) {
        updateData.status = 'draft';
      }
    }

    const updatedQuote = await this.quoteModel
      .findOneAndUpdate(query, updateData, { new: true })
      .populate('account', 'name id')
      .populate('customer', 'name email id')
      .exec();

    return updatedQuote;
  }

  async delete(id: string): Promise<Quote | null> {
    return this.quoteModel.findByIdAndDelete(id).exec();
  }

  async deleteByAccount(id: string, accountId: string): Promise<Quote | null> {
    const query = { _id: id, account: new Types.ObjectId(accountId) };
    return this.quoteModel.findOneAndDelete(query).exec();
  }
}
