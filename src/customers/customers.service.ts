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
        { cnpj: { $regex: search, $options: 'i' } },
        { phoneNumbers: { $elemMatch: { $regex: search, $options: 'i' } } },
        { 'address.street': { $regex: search, $options: 'i' } },
        { 'address.number': { $regex: search, $options: 'i' } },
        { 'address.complement': { $regex: search, $options: 'i' } },
        { 'address.neighborhood': { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } },
        { 'address.zipCode': { $regex: search, $options: 'i' } },
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

    // If equipments are being updated, preserve existing pictures
    if (customerData.equipments && Array.isArray(customerData.equipments)) {
      // Get the existing customer to preserve pictures
      const existingCustomer = await this.customerModel.findOne(query).exec();

      if (existingCustomer && existingCustomer.equipments) {
        // Preserve pictures for equipments that don't have them specified
        customerData.equipments = customerData.equipments.map((incomingEq, index) => {
          const existingEq = existingCustomer.equipments[index];
          if (existingEq && existingEq.pictures && incomingEq.pictures === undefined) {
            // Preserve existing pictures if not explicitly provided in the update
            return {
              ...incomingEq,
              pictures: existingEq.pictures
            };
          }
          return incomingEq;
        });
      }
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

    const updatedCustomer = await this.customerModel.findOneAndUpdate(query, update, { new: true }).populate('account', 'name id').exec();

    return updatedCustomer;
  }

  async deleteNote(id: string, noteId: string, userId: string, accountId: Types.ObjectId): Promise<Customer | null> {
    const query = { _id: id, account: accountId };
    const update = {
      $pull: {
        noteHistory: { _id: new Types.ObjectId(noteId) }
      }
    };

    const updatedCustomer = await this.customerModel.findOneAndUpdate(query, update, { new: true }).populate('account', 'name id').exec();

    return updatedCustomer;
  }

  async addEquipmentPicture(id: string, equipmentId: string, pictureUrls: string | string[], accountId: Types.ObjectId): Promise<Customer | null> {
    const query = { _id: id, account: accountId };

    // First, get the customer to check if the equipment exists
    const customer = await this.customerModel.findOne(query).exec();
    if (!customer || !customer.equipments || !customer.equipments.find((e) => e._id.toString() === equipmentId)) {
      return null;
    }

    // Handle both single URL and array of URLs
    const urls = Array.isArray(pictureUrls) ? pictureUrls : [pictureUrls];

    // Use positional operator to update the specific equipment
    const update = {
      $push: {
        [`equipments.$[elem].pictures`]: { $each: urls }
      }
    };
    const options = {
      new: true,
      arrayFilters: [{ 'elem._id': new Types.ObjectId(equipmentId) }]
    };

    const updatedCustomer = await this.customerModel.findOneAndUpdate(query, update, options).populate('account', 'name id').exec();
    return updatedCustomer;
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.customerModel.deleteMany({ account: accountId }).exec();
  }
}
