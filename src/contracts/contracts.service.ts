import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomersService } from 'src/customers/customers.service';
import { Contract, ContractDocument } from './schemas/contract.schema';

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    private readonly customerService: CustomersService
  ) {}

  async create(contractData: any): Promise<Contract> {
    // search the customer to make sure it exists
    const customer = await this.customerService.findByIdAndAccount(contractData.customer, contractData.account);

    if (!customer) {
      throw new Error('Customer not found for the given account');
    }
    contractData.customer = customer;
    const createdContract = new this.contractModel(contractData);
    const savedContract = await createdContract.save();
    return savedContract.toObject() as any;
  }

  async findAll(): Promise<Contract[]> {
    return this.contractModel.find().exec();
  }

  async findByAccount(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: string
  ): Promise<{
    contracts: Contract[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Use aggregation pipeline to search by customer name
    const pipeline: any[] = [
      { $match: { account: accountId } },
      // Lookup customer information (only name and email)
      {
        $lookup: {
          from: 'customers',
          let: { customerId: '$customer' },
          pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$customerId'] } } }, { $project: { name: 1, email: 1 } }],
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ];

    // Add search filter if search term is provided
    if (search) {
      const searchConditions: any[] = [{ terms: { $regex: search, $options: 'i' } }, { 'customer.name': { $regex: search, $options: 'i' } }];

      if (Types.ObjectId.isValid(search)) {
        searchConditions.push({ _id: new Types.ObjectId(search) });
      }

      pipeline.push({
        $match: {
          $or: searchConditions
        }
      });
    }

    // Add status filter if provided
    if (status) {
      pipeline.push({ $match: { status } });
    }

    // Add sorting and pagination
    pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit });

    // Get total count with same filtering
    const countPipeline: any[] = [
      { $match: { account: accountId } },
      // Lookup customer information (only name and email)
      {
        $lookup: {
          from: 'customers',
          let: { customerId: '$customer' },
          pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$customerId'] } } }, { $project: { name: 1, email: 1 } }],
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ];

    if (search) {
      const searchConditions: any[] = [{ terms: { $regex: search, $options: 'i' } }, { 'customer.name': { $regex: search, $options: 'i' } }];

      if (Types.ObjectId.isValid(search)) {
        searchConditions.push({ _id: new Types.ObjectId(search) });
      }

      countPipeline.push({
        $match: {
          $or: searchConditions
        }
      });
    }

    if (status) {
      countPipeline.push({ $match: { status } });
    }

    countPipeline.push({ $count: 'total' });

    const [contracts, countResult] = await Promise.all([this.contractModel.aggregate(pipeline).exec(), this.contractModel.aggregate(countPipeline).exec()]);

    const total = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      contracts,
      total,
      page,
      limit,
      totalPages
    };
  }

  async findOne(id: string): Promise<Contract | null> {
    return this.contractModel.findById(id).exec();
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<ContractDocument | null> {
    const contract = await this.contractModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('customer', 'name email phoneNumber')
      .exec();

    return contract;
  }

  async updateByAccount(id: string, contractData: any, accountId: Types.ObjectId): Promise<Contract | null> {
    const customer = await this.customerService.findByIdAndAccount(contractData.customer as string, accountId);

    if (!customer) {
      throw new Error('Customer not found for the given account');
    }
    contractData.customer = customer._id;
    const query = { _id: id, account: accountId };

    const updatedContract = await this.contractModel
      .findOneAndUpdate(query, contractData, { new: true })
      .populate('account', 'name id')
      .populate('customer', 'name email phoneNumber')
      .exec();

    return updatedContract;
  }

  async deleteByAccount(id: string, accountId: Types.ObjectId): Promise<Contract | null> {
    const query = { _id: id, account: accountId };
    return this.contractModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.contractModel.deleteMany({ account: accountId }).exec();
  }
}
