import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from './schemas/account.schema';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
  ) { }

  async create(accountData: Partial<Account>): Promise<Account> {
    const createdAccount = new this.accountModel(accountData);
    return createdAccount.save();
  }

  async findAll(): Promise<Account[]> {
    return this.accountModel.find().exec();
  }

  async findOne(id: string): Promise<Account | null> {
    return this.accountModel.findById(id).exec();
  }

  async findByAccountName(name: string): Promise<AccountDocument | null> {
    name = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex characters
    return this.accountModel
      .findOne({ name: { $regex: name, $options: 'i' } })
      .exec();
  }

  async update(
    id: string,
    accountData: Partial<Account>,
  ): Promise<Account | null> {
    return this.accountModel
      .findByIdAndUpdate(id, accountData, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Account | null> {
    return this.accountModel.findByIdAndDelete(id).exec();
  }
}
