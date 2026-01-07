import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address } from 'src/accounts/schemas/address.schema';
import { AccountsService } from '../accounts/accounts.service';
import { Customer, CustomerDocument } from './schemas/customer.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private readonly accountsService: AccountsService
  ) {}

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

    // Handle address creation - address is now required for customers
    const address = await this.accountsService.createAddress(
      accountId,
      customerData.address.street,
      customerData.address.number,
      customerData.address.city,
      customerData.address.state,
      customerData.address.zipCode,
      customerData.createdBy!,
      customerData.updatedBy!,
      customerData.address.complement,
      customerData.address.neighborhood,
      customerData.address.country || 'Brazil'
    );
    const addressId = (address as any)._id;
    // Remove address from customerData since we've created it separately
    delete customerData.address;

    // Equipments are now embedded in the customer
    const equipments = customerData.equipments || [];

    const createdCustomer = new this.customerModel({
      ...customerData,
      address: addressId,
      equipments: equipments
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
        .populate('address')
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
      .populate('address')
      .populate('technicianResponsible', 'name id')
      .exec();

    return customer;
  }

  async updateByAccount(
    id: string,
    customerData: Partial<Customer> & { address?: Partial<Address>; equipments?: any[] },
    accountId: Types.ObjectId
  ): Promise<Customer | null> {
    const query = { _id: id, account: accountId };

    const currentCustomer = await this.customerModel.findOne(query).exec();

    // Handle address update if address data is provided
    if (currentCustomer && customerData.address && typeof customerData.address === 'object' && currentCustomer.address) {
      await this.accountsService.updateAddress(
        currentCustomer.address.toString(),
        {
          ...customerData.address,
          updatedBy: customerData.updatedBy
        },
        accountId
      );
      // Remove address from customerData since we've handled it separately
      delete customerData.address;
    }

    // Equipments are now embedded, so just update the customer with the new equipments array
    const updatedCustomer = await this.customerModel
      .findOneAndUpdate(query, customerData, { new: true })
      .populate('account', 'name id')
      .populate('address')
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
