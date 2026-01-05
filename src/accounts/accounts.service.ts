import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Account, AccountDocument } from './schemas/account.schema';
import { Address, AddressDocument } from './schemas/address.schema';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>
  ) {}

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
    return this.accountModel.findOne({ name: { $regex: name, $options: 'i' } }).exec();
  }

  async findByVerificationToken(token: string): Promise<AccountDocument | null> {
    return this.accountModel
      .findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: new Date() }
      })
      .exec();
  }

  async update(id: string, accountData: Partial<Account>): Promise<Account | null> {
    return this.accountModel.findByIdAndUpdate(id, accountData, { new: true }).exec();
  }

  async delete(id: string): Promise<Account | null> {
    return this.accountModel.findByIdAndDelete(id).exec();
  }

  // Address methods
  async createAddress(
    accountId: any,
    street: string,
    number: string,
    city: string,
    state: string,
    zipCode: string,
    createdBy: string,
    updatedBy: string,
    complement?: string,
    neighborhood?: string,
    country: string = 'Brazil'
  ): Promise<Address> {
    const createdAddress = new this.addressModel({
      account: accountId,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      country,
      createdBy,
      updatedBy
    });
    return createdAddress.save();
  }

  async updateAddress(id: string, addressData: Partial<Address>, accountId: string): Promise<Address | null> {
    const query = { _id: id, account: accountId };
    const data = await this.addressModel.findOneAndUpdate(query, addressData, { new: true }).exec();
    return data;
  }

  async findAddressById(id: string, accountId: string): Promise<AddressDocument | null> {
    return this.addressModel.findOne({ _id: id, account: accountId }).exec();
  }
}
