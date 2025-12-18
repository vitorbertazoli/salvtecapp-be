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
    username: string,
    roles: string[] = [],
    createdBy: string,
    updatedBy: string,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({
      account: new Types.ObjectId(account),
      firstName,
      lastName,
      email,
      passwordHash: hashedPassword,
      username,
      roles: roles.map((role) => new Types.ObjectId(role)),
      createdBy,
      updatedBy,
    });
    return createdUser.save();
  }

  async findOneByAccountAndEmail(
    account: string,
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ account, email }).exec();
  }

  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).populate('roles').exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findOneByUsernameAndAccount(
    username: string,
    accountId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        username: username,
        account: new Types.ObjectId(accountId),
      })
      .populate('account', 'name id logoUrl')
      .populate('roles', 'name')
      .exec();
  }
}
