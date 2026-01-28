import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private customerModel: Model<CustomerDocument>) {}

  async create(customerData: Partial<Customer> & { address?: any; equipments?: any[] }, accountId: Types.ObjectId): Promise<Customer> {
    // Set default type if not provided
    if (!customerData.type) {
      customerData.type = 'residential';
    }

    // Ensure type-specific fields are properly set
    if (customerData.type === 'residential') {
      customerData.cpf = customerData.cpf || undefined;
      customerData.cnpj = undefined;
      customerData.contactName = undefined;
    } else if (customerData.type === 'commercial') {
      customerData.cpf = undefined;
      customerData.cnpj = customerData.cnpj || undefined;
      customerData.contactName = customerData.contactName || undefined;
    }

    // Address is now embedded directly in the customer
    const address = customerData.address
      ? {
          ...customerData.address,
          country: customerData.address.country || 'Brazil'
        }
      : undefined;

    // Equipments are now embedded in the customer
    const equipments = customerData.equipments || [];

    const createdCustomer = new this.customerModel({
      ...customerData,
      address,
      equipments,
      account: accountId
    });
    const savedCustomer = await createdCustomer.save();

    // Return customer with equipments included
    return savedCustomer.toObject() as any;
  }

  async findAll(): Promise<Customer[]> {
    return this.customerModel.find().exec();
  }

  async findByAccount(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: string
  ): Promise<{
    customers: Customer[];
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
        { email: { $regex: search, $options: 'i' } },
        { cpf: { $regex: search, $options: 'i' } },
        { phoneNumbers: { $elemMatch: { $regex: search, $options: 'i' } } },
        ...(Types.ObjectId.isValid(search) ? [{ _id: search }] : [])
      ];
    }
    if (status) {
      searchQuery.status = status;
    }

    const [customers, total] = await Promise.all([
      this.customerModel.find(searchQuery).populate('account', 'name id').sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.customerModel.countDocuments(searchQuery).exec()
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      customers: customers.map((c) => (c.toObject ? c.toObject() : c)),
      total,
      page,
      limit,
      totalPages
    };
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<CustomerDocument | null> {
    const customer = await this.customerModel.findOne({ _id: id, account: accountId }).populate('account', 'name id').exec();

    return customer;
  }

  async updateByAccount(
    id: string,
    customerData: Partial<Customer> & { address?: any; equipments?: any[] },
    accountId: Types.ObjectId
  ): Promise<Customer | null> {
    const query = { _id: id, account: accountId };

    // Handle address update - address is now embedded directly
    if (customerData.address && typeof customerData.address === 'object') {
      customerData.address = {
        ...customerData.address,
        country: customerData.address.country || 'Brazil'
      };
    }

    // Equipments are now embedded, so just update the customer with the new equipments array
    const updatedCustomer = await this.customerModel.findOneAndUpdate(query, customerData, { new: true }).populate('account', 'name id').exec();

    return updatedCustomer;
  }

  async deleteByAccount(id: string, accountId: Types.ObjectId): Promise<Customer | null> {
    const query = { _id: id, account: accountId };
    return this.customerModel.findOneAndDelete(query).exec();
  }

  async addNote(id: string, noteData: { content: string }, userId: string, accountId: Types.ObjectId): Promise<Customer | null> {
    const query = { _id: id, account: accountId };
    const note = {
      date: new Date(),
      content: noteData.content,
      createdBy: new Types.ObjectId(userId)
    };

    const updatedCustomer = await this.customerModel
      .findOneAndUpdate(query, { $push: { noteHistory: note } }, { new: true })
      .populate('account', 'name id')
      .exec();

    return updatedCustomer;
  }

  async updateNote(id: string, noteId: string, noteData: { content: string }, userId: string, accountId: Types.ObjectId): Promise<Customer | null> {
    const query = { _id: id, account: accountId, 'noteHistory._id': new Types.ObjectId(noteId) };
    const update = {
      $set: {
        'noteHistory.$.content': noteData.content,
        'noteHistory.$.date': new Date(),
        'noteHistory.$.createdBy': new Types.ObjectId(userId)
      }
    };

    const updatedCustomer = await this.customerModel
      .findOneAndUpdate(query, update, { new: true })
      .populate('account', 'name id')
      .exec();

    return updatedCustomer;
  }

  async deleteNote(id: string, noteId: string, userId: string, accountId: Types.ObjectId): Promise<Customer | null> {
    const query = { _id: id, account: accountId };
    const update = {
      $pull: {
        noteHistory: { _id: new Types.ObjectId(noteId) }
      }
    };

    const updatedCustomer = await this.customerModel
      .findOneAndUpdate(query, update, { new: true })
      .populate('account', 'name id')
      .exec();

    return updatedCustomer;
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.customerModel.deleteMany({ account: accountId }).exec();
  }
}
