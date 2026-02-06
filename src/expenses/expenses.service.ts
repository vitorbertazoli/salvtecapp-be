import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense, ExpenseDocument } from './schemas/expense.schema';

@Injectable()
export class ExpensesService {
  constructor(@InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>) {}

  async create(createExpenseDto: CreateExpenseDto, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<Expense> {
    const expense = new this.expenseModel({
      ...createExpenseDto,
      account: accountId,
      expenseDate: createExpenseDto.expenseDate,
      createdBy: userId,
      updatedBy: userId
    });

    return expense.save();
  }

  async findAll(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    category?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: Expense[]; total: number }> {
    const skip = (page - 1) * limit;

    const query: any = { account: accountId };

    // Add search filter
    if (search) {
      query.$or = [{ title: { $regex: search, $options: 'i' } }];
    }

    // Add category filter
    if (category) {
      query.category = category;
    }

    // Add date range filter
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) {
        query.expenseDate.$gte = startDate;
      }
      if (endDate) {
        query.expenseDate.$lte = endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.expenseModel
        .find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.expenseModel.countDocuments(query).exec()
    ]);

    return { data, total };
  }

  async findOne(id: string, accountId: Types.ObjectId): Promise<Expense> {
    const expense = await this.expenseModel
      .findOne({ _id: id, account: accountId })
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .exec();

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<Expense> {
    const updateData: any = {
      ...updateExpenseDto,
      updatedBy: userId
    };

    // Convert string IDs to ObjectIds
    if (updateExpenseDto.approvedBy) {
      updateData.approvedBy = new Types.ObjectId(updateExpenseDto.approvedBy);
    }

    const expense = await this.expenseModel
      .findOneAndUpdate({ _id: id, account: accountId }, updateData, { new: true, runValidators: true })
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .exec();

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async remove(id: string, accountId: Types.ObjectId): Promise<void> {
    const result = await this.expenseModel.deleteOne({ _id: id, account: accountId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Expense not found');
    }
  }

  async getExpenseStats(
    accountId: Types.ObjectId,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalExpenses: number;
    categoryBreakdown: { category: string; total: number; count: number }[];
    monthlyBreakdown: { month: string; total: number; count: number }[];
  }> {
    const matchQuery: any = { account: accountId };

    if (startDate || endDate) {
      matchQuery.expenseDate = {};
      if (startDate) {
        matchQuery.expenseDate.$gte = startDate;
      }
      if (endDate) {
        matchQuery.expenseDate.$lte = endDate;
      }
    }

    const [totalResult, categoryResult, monthlyResult] = await Promise.all([
      this.expenseModel.aggregate([{ $match: matchQuery }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      this.expenseModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),
      this.expenseModel.aggregate([
        { $match: matchQuery },
        {
          $addFields: {
            expenseDateObj: {
              $dateFromString: {
                dateString: '$expenseDate',
                format: '%Y/%m/%d'
              }
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$expenseDateObj' },
              month: { $month: '$expenseDateObj' }
            },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                {
                  $cond: {
                    if: { $lt: ['$_id.month', 10] },
                    then: { $concat: ['0', { $toString: '$_id.month' }] },
                    else: { $toString: '$_id.month' }
                  }
                }
              ]
            },
            total: 1,
            count: 1
          }
        },
        { $sort: { month: 1 } }
      ])
    ]);

    return {
      totalExpenses: totalResult[0]?.total || 0,
      categoryBreakdown: categoryResult.map((item) => ({
        category: item._id,
        total: item.total,
        count: item.count
      })),
      monthlyBreakdown: monthlyResult.map((item) => ({
        month: item.month,
        total: item.total,
        count: item.count
      }))
    };
  }
}
