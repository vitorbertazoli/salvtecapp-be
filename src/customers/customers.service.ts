import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>
  ) { }

  async create(customerData: Partial<Customer> & { address?: any; equipments?: any[] }, accountId: Types.ObjectId): Promise<Customer> {
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
    const address = customerData.address ? {
      ...customerData.address,
      country: customerData.address.country || 'Brazil'
    } : undefined;

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
        { phoneNumber: { $regex: search, $options: 'i' } },
        { _id: Types.ObjectId.isValid(search) ? search : undefined }
      ];
    }
    if (status) {
      searchQuery.status = status;
    }

    const [customers, total] = await Promise.all([
      this.customerModel
        .find(searchQuery)
        .populate('account', 'name id')
        .populate('technicianResponsible', 'name id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.customerModel.countDocuments(searchQuery).exec()
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      customers: customers.map((c) => c.toObject()),
      total,
      page,
      limit,
      totalPages
    };
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<CustomerDocument | null> {
    const customer = await this.customerModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('technicianResponsible', 'name id')
      .exec();

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
    const updatedCustomer = await this.customerModel
      .findOneAndUpdate(query, customerData, { new: true })
      .populate('account', 'name id')
      .populate('technicianResponsible', 'name id')
      .exec();

    return updatedCustomer;
  }

  async deleteByAccount(id: string, accountId: Types.ObjectId): Promise<Customer | null> {
    const query = { _id: id, account: accountId };
    return this.customerModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.customerModel.deleteMany({ account: accountId }).exec();
  }
}
