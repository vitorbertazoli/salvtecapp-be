import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(
    account: Types.ObjectId,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    roles: string[] = [],
    createdBy: Types.ObjectId,
    updatedBy: Types.ObjectId
  ): Promise<User> {
    const user = await this.userModel.findOne({ email }).exec();
    if (user) {
      throw new BadRequestException('users.errors.emailAlreadyExists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({
      account: new Types.ObjectId(account),
      firstName,
      lastName,
      email,
      passwordHash: hashedPassword,
      roles: roles.map((role) => new Types.ObjectId(role)),
      createdBy,
      updatedBy
    });
    return createdUser.save();
  }

  async findOneByAccountAndEmail(account: Types.ObjectId, email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ account, email }).exec();
  }

  async findOneByEmail(email: string): Promise<(UserDocument & { account: any }) | null> {
    return this.userModel.findOne({ email }).populate('account', 'name id logoUrl status').populate('roles').exec();
  }

  async findById(id: string): Promise<(UserDocument & { account: any }) | null> {
    return this.userModel.findById(id).populate('account', 'name id logoUrl status').populate('roles', 'name').exec();
  }

  async findAll(): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const users = await this.userModel.find().populate('account', 'name id logoUrl').populate('roles', 'name').exec();
    return {
      users: users,
      total: users.length,
      page: 1,
      limit: users.length,
      totalPages: 1
    };
  }

  async findByAccount(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = ''
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery: any = { account: accountId };
    if (search) {
      // Split search term into individual words for better name matching
      const searchWords = search.trim().split(/\s+/);

      // Create search conditions
      const searchConditions: any[] = [];

      // If search contains multiple words, try to match first and last name combinations
      if (searchWords.length >= 2) {
        // Match "First Last" as firstName + lastName
        searchConditions.push({
          $and: [{ firstName: { $regex: searchWords[0], $options: 'i' } }, { lastName: { $regex: searchWords.slice(1).join(' '), $options: 'i' } }]
        });

        // Also match "Last, First" format
        searchConditions.push({
          $and: [{ firstName: { $regex: searchWords.slice(1).join(' '), $options: 'i' } }, { lastName: { $regex: searchWords[0], $options: 'i' } }]
        });
      }

      // Add individual field matches
      searchConditions.push(
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      );

      searchQuery.$or = searchConditions;
    }

    // Use aggregation pipeline to exclude TECHNICIAN users
    const pipeline: any[] = [
      { $match: searchQuery },
      // Lookup roles
      {
        $lookup: {
          from: 'roles',
          localField: 'roles',
          foreignField: '_id',
          as: 'userRoles'
        }
      },
      // Filter out users with TECHNICIAN role
      // {
      //   $match: {
      //     'userRoles.name': { $ne: 'TECHNICIAN' }
      //   }
      // },
      // Populate account
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
      // Project final document structure with populated roles
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          status: 1,
          account: 1,
          roles: {
            $map: {
              input: '$userRoles',
              as: 'role',
              in: {
                _id: '$$role._id',
                name: '$$role.name'
              }
            }
          },
          createdAt: 1,
          updatedAt: 1
        }
      },
      // Sort and paginate
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    // Get total count with same filtering
    const countPipeline = [
      { $match: searchQuery },
      {
        $lookup: {
          from: 'roles',
          localField: 'roles',
          foreignField: '_id',
          as: 'userRoles'
        }
      },
      {
        $match: {
          'userRoles.name': { $ne: 'TECHNICIAN' }
        }
      },
      { $count: 'total' }
    ];

    const [users, countResult] = await Promise.all([this.userModel.aggregate(pipeline).exec(), this.userModel.aggregate(countPipeline).exec()]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages
    };
  }

  async update(id: string, userData: Partial<User> & { password?: string }, accountId: Types.ObjectId): Promise<User | null> {
    const query = { _id: id, account: accountId };

    // Hash password if provided
    if (userData.password) {
      userData.passwordHash = await bcrypt.hash(userData.password, 10);
      delete userData.password; // Remove plain password from userData
    }

    return this.userModel.findOneAndUpdate(query, userData, { new: true }).populate('account', 'name id logoUrl').populate('roles', 'name').exec();
  }

  async updateLanguage(id: string, language: string, accountId: Types.ObjectId): Promise<User | null> {
    const query = { _id: id, account: accountId };
    return this.userModel.findOneAndUpdate(query, { language }, { new: true }).populate('account', 'name id logoUrl').populate('roles', 'name').exec();
  }

  async delete(id: string, accountId: Types.ObjectId): Promise<User | null> {
    const query = { _id: id, account: accountId };
    return this.userModel.findOneAndDelete(query).exec();
  }

  async deleteById(id: string): Promise<User | null> {
    const query = { _id: id };
    return this.userModel.findOneAndDelete(query).exec();
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: id, account: accountId }).populate('account', 'name id logoUrl').populate('roles', 'name').exec();
  }

  async updateResetToken(email: string, resetToken: string, resetTokenExpiry: Date): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate({ email }, { resetToken, resetTokenExpiry }, { new: true }).exec();
  }

  async findByResetToken(resetToken: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        resetToken,
        resetTokenExpiry: { $gt: new Date() }
      })
      .exec();
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.userModel.deleteMany({ account: accountId }).exec();
  }
}
