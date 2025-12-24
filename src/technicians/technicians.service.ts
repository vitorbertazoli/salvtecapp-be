import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { Technician, TechnicianDocument } from './schemas/technician.schema';

@Injectable()
export class TechniciansService {
  constructor(
    @InjectModel(Technician.name) private technicianModel: Model<TechnicianDocument>,
    private readonly accountsService: AccountsService
  ) {}

  async create(
    account: string,
    name: string,
    email: string,
    cpf: string,
    phoneNumber: string,
    addressData: {
      street: string;
      number: string;
      complement?: string;
      neighborhood?: string;
      city: string;
      state: string;
      zipCode: string;
      country?: string;
    },
    createdBy: string,
    updatedBy: string
  ): Promise<Technician> {
    // Create the address first
    const address = await this.accountsService.createAddress(
      account,
      addressData.street,
      addressData.number,
      addressData.city,
      addressData.state,
      addressData.zipCode,
      createdBy,
      updatedBy,
      addressData.complement,
      addressData.neighborhood,
      addressData.country || 'Brazil'
    );

    // Create the technician with the address reference
    const createdTechnician = new this.technicianModel({
      account: new Types.ObjectId(account),
      name,
      email,
      cpf,
      phoneNumber,
      address: (address as any)._id, // Cast to any to access _id from the saved document
      createdBy,
      updatedBy
    });
    return createdTechnician.save();
  }

  async findByAccount(
    accountId: string,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: string
  ): Promise<{
    technicians: Technician[];
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
        { _id: Types.ObjectId.isValid(search) ? new Types.ObjectId(search) : undefined }
      ];
    }
    if (status) {
      searchQuery.status = status;
    }

    const [technicians, total] = await Promise.all([
      this.technicianModel.find(searchQuery).populate('account', 'name id').populate('address').sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.technicianModel.countDocuments(searchQuery).exec()
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      technicians,
      total,
      page,
      limit,
      totalPages
    };
  }

  async update(id: string, technicianData: Partial<Technician> & { address?: any }, accountId: string): Promise<Technician | null> {
    const query = { _id: id, account: new Types.ObjectId(accountId) };

    // Handle address update if address data is provided
    if (technicianData.address && typeof technicianData.address === 'object') {
      // First, get the current technician to find the address ID
      const currentTechnician = await this.technicianModel.findOne(query).exec();
      if (currentTechnician && currentTechnician.address) {
        // Update the existing address
        await this.accountsService.updateAddress(
          currentTechnician.address.toString(),
          {
            ...technicianData.address,
            updatedBy: technicianData.updatedBy
          },
          accountId
        );
      }
      // Remove address from technicianData since we've handled it separately
      delete technicianData.address;
    }

    return this.technicianModel.findOneAndUpdate(query, technicianData, { new: true }).populate('account', 'name id').populate('address').exec();
  }

  async delete(id: string, accountId: string): Promise<Technician | null> {
    const query = { _id: id, account: new Types.ObjectId(accountId) };
    return this.technicianModel.findOneAndDelete(query).exec();
  }

  async findByIdAndAccount(id: string, accountId: string): Promise<TechnicianDocument | null> {
    return this.technicianModel
      .findOne({ _id: id, account: new Types.ObjectId(accountId) })
      .populate('account', 'name id')
      .populate('address')
      .exec();
  }

  async findOneByCpfAndAccount(cpf: string, accountId: string): Promise<TechnicianDocument | null> {
    return this.technicianModel
      .findOne({
        cpf: cpf,
        account: new Types.ObjectId(accountId)
      })
      .populate('account', 'name id')
      .populate('address')
      .exec();
  }
}
