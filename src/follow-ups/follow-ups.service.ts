import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CustomersService } from 'src/customers/customers.service';
import { FollowUp, FollowUpDocument } from './schemas/follow-up.schema';

@Injectable()
export class FollowUpsService {
  constructor(
    @InjectModel(FollowUp.name) private followUpModel: Model<FollowUpDocument>,
    private customersService: CustomersService
  ) {}

  async create(followUpData: Partial<FollowUp> & { customer: string }): Promise<FollowUp> {
    const customerId = followUpData.customer;

    // check if customer exists
    const customerExists = await this.customersService.findByIdAndAccount(customerId, followUpData.account!);
    if (!customerExists) {
      throw new NotFoundException('Customer not found');
    }

    // Ensure notes is an array
    if (followUpData.notes) {
      if (typeof followUpData.notes === 'string') {
        followUpData.notes = [followUpData.notes];
      } else if (!Array.isArray(followUpData.notes)) {
        followUpData.notes = [];
      }
    }

    const createdFollowUp = new this.followUpModel(followUpData);
    const savedFollowUp = await createdFollowUp.save();
    return savedFollowUp.toObject() as any;
  }

  async findAll(): Promise<FollowUp[]> {
    return this.followUpModel.find().exec();
  }

  async findByAccount(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 50,
    search: string = '',
    status?: string,
    customerId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    followUps: FollowUp[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions: any = { account: accountId };
    if (status) {
      matchConditions.status = status;
    }
    if (customerId) {
      matchConditions.customer = new Types.ObjectId(customerId);
    }
    if (startDate || endDate) {
      matchConditions.startDate = {};
      if (startDate) {
        matchConditions.startDate.$gte = startDate;
      }
      if (endDate) {
        matchConditions.startDate.$lte = endDate;
      }
    }

    // Build search pipeline if search term is provided
    const pipeline: any[] = [
      { $match: matchConditions },
      // Join with customers collection for search
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
          $or: [{ 'customer.name': { $regex: search, $options: 'i' } }, { 'customer.email': { $regex: search, $options: 'i' } }]
        }
      });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: { startDate: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Project to limit fields
      {
        $project: {
          customer: {
            _id: '$customer._id',
            name: '$customer.name',
            email: '$customer.email',
            phoneNumbers: '$customer.phoneNumbers'
          },
          account: 1,
          startDate: 1,
          status: 1,
          completedAt: 1,
          completedBy: 1,
          notes: 1,
          createdBy: 1,
          updatedBy: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    );

    // Get total count with search filter
    const countPipeline = [...pipeline];
    countPipeline.splice(countPipeline.length - 3, 3, { $count: 'total' });

    const [followUps, countResult] = await Promise.all([
      this.followUpModel.aggregate(pipeline).exec(),
      search ? this.followUpModel.aggregate(countPipeline).exec() : this.followUpModel.countDocuments(matchConditions).exec()
    ]);

    const total = search && Array.isArray(countResult) && countResult.length > 0 ? countResult[0].total : (countResult as number);
    const totalPages = Math.ceil(total / limit);

    return {
      followUps,
      total,
      page,
      limit,
      totalPages
    };
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<FollowUpDocument | null> {
    const followUp = await this.followUpModel
      .findOne({ _id: id, account: accountId })
      .populate('customer', 'name email phoneNumbers')
      .populate('account', 'name')
      .exec();

    return followUp;
  }

  async updateByAccount(id: string, followUpData: Partial<FollowUp>, accountId: Types.ObjectId): Promise<FollowUp | null> {
    const query = { _id: id, account: accountId };

    // Handle notes appending - if notes are provided, append to existing array
    if (followUpData.notes && Array.isArray(followUpData.notes)) {
      const existingFollowUp = await this.followUpModel.findOne(query).exec();
      if (existingFollowUp) {
        const existingNotes = existingFollowUp.notes || [];
        followUpData.notes = [...existingNotes, ...followUpData.notes];
      }
    }

    const updatedFollowUp = await this.followUpModel.findOneAndUpdate(query, followUpData, { new: true }).populate('customer', 'name email phoneNumbers').exec();

    return updatedFollowUp;
  }

  async deleteByAccount(id: string, accountId: Types.ObjectId): Promise<FollowUp | null> {
    const query = { _id: id, account: accountId };
    return this.followUpModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.followUpModel.deleteMany({ account: accountId }).exec();
  }
}
