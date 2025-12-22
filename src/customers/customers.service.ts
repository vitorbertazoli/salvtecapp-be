import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address } from 'src/accounts/schemas/address.schema';
import { AccountsService } from '../accounts/accounts.service';
import { EquipmentService } from '../equipment/equipment.service';
import { Customer, CustomerDocument } from './schemas/customer.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private readonly accountsService: AccountsService,
    private readonly equipmentService: EquipmentService
  ) {}

  async create(customerData: Partial<Customer> & { address?: any; equipments?: any[] }): Promise<Customer> {
    // Handle address creation - address is now required for customers
    let addressId: Types.ObjectId;
    if (customerData.address && typeof customerData.address === 'object') {
      const address = await this.accountsService.createAddress(
        customerData.account!.toString(),
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
      addressId = (address as any)._id;
      // Remove address from customerData since we've created it separately
      delete customerData.address;
    } else {
      throw new Error('Address is required for customers');
    }

    // Handle equipments if provided
    const equipments = customerData.equipments || [];
    delete customerData.equipments; // Remove equipments from customer data

    const createdCustomer = new this.customerModel({
      ...customerData,
      address: addressId
    });
    const savedCustomer = await createdCustomer.save();

    // Create equipment records for this customer
    if (equipments.length > 0) {
      for (const equipmentData of equipments) {
        await this.equipmentService.create({
          ...equipmentData,
          customer: savedCustomer._id,
          account: customerData.account,
          createdBy: customerData.createdBy,
          updatedBy: customerData.updatedBy
        });
      }
    }

    // Fetch equipment for the created customer
    const createdEquipments = await this.equipmentService.findByCustomer(savedCustomer._id.toString());
    // Return customer with equipments included
    return {
      ...savedCustomer.toObject(),
      equipments: createdEquipments
    } as any;
  }

  async findAll(): Promise<Customer[]> {
    return this.customerModel.find().exec();
  }

  async findByAccount(
    accountId: string,
    page: number = 1,
    limit: number = 10,
    search: string = ''
  ): Promise<{
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery: any = { account: new Types.ObjectId(accountId) };
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { cpf: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
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

    // Fetch equipment for each customer
    const customersWithEquipment = await Promise.all(
      customers.map(async (customer) => {
        const equipment = await this.equipmentService.findByCustomer(customer._id.toString());
        return { ...customer.toObject(), equipments: equipment };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      customers: customersWithEquipment,
      total,
      page,
      limit,
      totalPages
    };
  }

  async findOne(id: string): Promise<Customer | null> {
    return this.customerModel.findById(id).exec();
  }

  async findByIdAndAccount(id: string, accountId: string): Promise<CustomerDocument | null> {
    const customer = await this.customerModel
      .findOne({ _id: id, account: new Types.ObjectId(accountId) })
      .populate('account', 'name id')
      .populate('address')
      .populate('technicianResponsible', 'name id')
      .exec();

    if (customer) {
      // Fetch equipment for this customer
      const equipments = await this.equipmentService.findByCustomer(id);
      // Return customer with equipments included
      return {
        ...customer.toObject(),
        equipments
      } as any;
    }

    return customer;
  }

  async update(id: string, customerData: Partial<Customer>): Promise<Customer | null> {
    return this.customerModel.findByIdAndUpdate(id, customerData, { new: true }).exec();
  }

  async updateByAccount(
    id: string,
    customerData: Partial<Customer> & { address?: Partial<Address>; equipments?: any[] },
    accountId: string
  ): Promise<Customer | null> {
    const query = { _id: id, account: new Types.ObjectId(accountId) };

    const currentCustomer = await this.customerModel.findOne(query).exec();

    // Handle address update if address data is provided
    if (currentCustomer && customerData.address && typeof customerData.address === 'object') {
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

    const currentCustomerEquipments = await this.equipmentService.findByCustomer(id);
    // Compare the currentCustomerEquipments with the customerData.equipments to determine additions, updates, deletions
    const equipmentsToUpdate = customerData.equipments || [];
    const equipmentsToUpdateIds = equipmentsToUpdate.filter((eq) => eq._id).map((eq) => eq._id);
    // const currentEquipmentIds = currentCustomerEquipments.map((eq: any) => eq._id.toString());

    // Equipments to delete
    const equipmentsToDelete = currentCustomerEquipments.filter((eq: any) => !equipmentsToUpdateIds.includes(eq._id.toString()));
    for (const equipment of equipmentsToDelete) {
      await this.equipmentService.delete((equipment as any)._id.toString());
    }

    // Equipments to add or update
    for (const equipmentData of equipmentsToUpdate) {
      if (equipmentData._id) {
        // Update existing equipment
        const updatedEquip = await this.equipmentService.update(equipmentData._id, {
          ...equipmentData,
          customer: currentCustomer!._id,
          account: new Types.ObjectId(accountId),
          updatedBy: customerData.updatedBy
        });
        console.log('Updated Equipment:', updatedEquip);
      } else {
        // Create new equipment
        const createdEquip = await this.equipmentService.create({
          ...equipmentData,
          customer: currentCustomer!._id,
          account: new Types.ObjectId(accountId),
          createdBy: customerData.updatedBy!,
          updatedBy: customerData.updatedBy!
        });
        console.log('Created Equipment:', createdEquip);
      }
    }

    const updatedCustomer = await this.customerModel
      .findOneAndUpdate(query, customerData, { new: true })
      .populate('account', 'name id')
      .populate('address')
      .populate('technicianResponsible', 'name id')
      .exec();

    if (updatedCustomer) {
      // Fetch equipment for the updated customer
      const equipments = await this.equipmentService.findByCustomer(id);
      // Return customer with equipments included
      return {
        ...updatedCustomer.toObject(),
        equipments
      } as any;
    }

    return updatedCustomer;
  }

  async delete(id: string): Promise<Customer | null> {
    return this.customerModel.findByIdAndDelete(id).exec();
  }

  async deleteByAccount(id: string, accountId: string): Promise<Customer | null> {
    const query = { _id: id, account: new Types.ObjectId(accountId) };
    return this.customerModel.findOneAndDelete(query).exec();
  }
}
