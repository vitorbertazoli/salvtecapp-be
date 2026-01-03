import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  async create(
    account: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    roles: string[] = [],
    createdBy: string,
    updatedBy: string
  ): Promise<User> {
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

  async findOneByAccountAndEmail(account: string, email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ account, email }).exec();
  }

  async findOneByEmail(email: string): Promise<UserDocument & { account: any } | null> {
    return this.userModel.findOne({ email }).populate('account', 'name id logoUrl status').populate('roles').exec();
  }

  async findById(id: string): Promise<UserDocument & { account: any } | null> {
    return this.userModel.findById(id).populate('account', 'name id logoUrl status').populate('roles', 'name').exec();
  }

  async findByAccount(
    accountId: string,
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
      searchQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel.find(searchQuery).populate('account', 'name id logoUrl').populate('roles', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(searchQuery).exec()
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages
    };
  }

  async update(id: string, userData: Partial<User> & { password?: string }, accountId: string): Promise<User | null> {
    const query = { _id: id, account: accountId };

    // Hash password if provided
    if (userData.password) {
      userData.passwordHash = await bcrypt.hash(userData.password, 10);
      delete userData.password; // Remove plain password from userData
    }

    return this.userModel.findOneAndUpdate(query, userData, { new: true }).populate('account', 'name id logoUrl').populate('roles', 'name').exec();
  }

  async delete(id: string, accountId: string): Promise<User | null> {
    const query = { _id: id, account: accountId };
    return this.userModel.findOneAndDelete(query).exec();
  }

  async findByIdAndAccount(id: string, accountId: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id logoUrl')
      .populate('roles', 'name')
      .exec();
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

  async deleteAllByAccount(accountId: string): Promise<any> {
    return this.userModel.deleteMany({ account: accountId }).exec();
  }
}
