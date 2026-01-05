import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { Role } from '../roles/schemas/role.schema';
import { UsersService } from '../users/users.service';
import { Technician, TechnicianDocument } from './schemas/technician.schema';

@Injectable()
export class TechniciansService {
  constructor(
    @InjectModel(Technician.name) private technicianModel: Model<TechnicianDocument>,
    @InjectModel(Role.name) private roleModel: Model<any>,
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService
  ) {}

  async create(
    account: string,
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
    updatedBy: string,
    userAccountData?: {
      password: string;
      firstName: string;
      lastName: string;
      email: string;
      roles: string[];
    }
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

    let userId: Types.ObjectId | undefined;

    // Create user account if provided
    if (userAccountData) {
      // Check if email already exists
      const existingEmailUser = await this.usersService.findOneByAccountAndEmail(account, userAccountData.email);
      if (existingEmailUser) {
        throw new Error('Email already exists');
      }

      // Get role IDs for the roles
      const roleIds = await this.getRoleIds(['TECHNICIAN']);

      const user = await this.usersService.create(
        account,
        userAccountData.firstName,
        userAccountData.lastName,
        userAccountData.email,
        userAccountData.password,
        roleIds,
        createdBy,
        updatedBy
      );
      userId = (user as any)._id;
    }

    // Create the technician with the address and user references
    const createdTechnician = new this.technicianModel({
      account: new Types.ObjectId(account),
      cpf,
      phoneNumber,
      address: (address as any)._id, // Cast to any to access _id from the saved document
      user: userId,
      createdBy,
      updatedBy
    });
    return createdTechnician.save();
  }

  private async getRoleIds(roleNames: string[]): Promise<string[]> {
    const roles = await this.roleModel.find({ name: { $in: roleNames } }).exec();
    return roles.map((role) => role._id.toString());
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

    // Build aggregation pipeline for search
    const pipeline: any[] = [
      {
        $match: { account: accountId }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'addresses',
          localField: 'address',
          foreignField: '_id',
          as: 'address'
        }
      },
      {
        $unwind: {
          path: '$address',
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    // Add search filter if provided
    if (search) {
      // Split search term into individual words for better name matching
      const searchWords = search.trim().split(/\s+/);

      // Create search conditions with proper typing
      const searchConditions: any[] = [];

      // If search contains multiple words, try to match first and last name combinations
      if (searchWords.length >= 2) {
        // Match "First Last" as firstName + lastName
        searchConditions.push({
          $and: [
            { 'user.firstName': { $regex: searchWords[0], $options: 'i' } },
            { 'user.lastName': { $regex: searchWords.slice(1).join(' '), $options: 'i' } }
          ]
        });

        // Also match "Last, First" format
        searchConditions.push({
          $and: [
            { 'user.firstName': { $regex: searchWords.slice(1).join(' '), $options: 'i' } },
            { 'user.lastName': { $regex: searchWords[0], $options: 'i' } }
          ]
        });
      }

      // Add individual field matches
      searchConditions.push(
        { cpf: { $regex: search, $options: 'i' } },
        { 'user.firstName': { $regex: search, $options: 'i' } },
        { 'user.lastName': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      );

      // Add ObjectId match if valid
      if (Types.ObjectId.isValid(search)) {
        searchConditions.push({ _id: new Types.ObjectId(search) });
      }

      pipeline.push({
        $match: {
          $or: searchConditions
        }
      });
    }

    // Add status filter if provided
    if (status) {
      pipeline.push({
        $match: { 'user.status': status }
      });
    }

    // Add sorting, pagination
    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          technicians: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }]
        }
      }
    );

    const result = await this.technicianModel.aggregate(pipeline).exec();
    const technicians = result[0]?.technicians || [];
    const total = result[0]?.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      technicians,
      total,
      page,
      limit,
      totalPages
    };
  }

  async update(
    id: string,
    accountId: string,
    technicianData: Partial<Technician> & { address?: any; userAccount?: any },
    addressData?: any,
    userAccountData?: any
  ): Promise<Technician | null> {
    const query = { _id: id, account: accountId };

    // Handle address update if address data is provided
    if (addressData && typeof addressData === 'object') {
      // First, get the current technician to find the address ID
      const currentTechnician = await this.technicianModel.findOne(query).exec();
      if (currentTechnician && currentTechnician.address) {
        // Update the existing address
        await this.accountsService.updateAddress(
          currentTechnician.address.toString(),
          {
            ...addressData,
            updatedBy: technicianData.updatedBy
          },
          accountId
        );
      }
    }

    // Handle user account update if userAccount data is provided
    if (userAccountData && typeof userAccountData === 'object') {
      // Get the current technician to find the user ID
      const currentTechnician = await this.technicianModel.findOne(query).populate('user').exec();
      if (currentTechnician && currentTechnician.user) {
        const userId = (currentTechnician.user as any)._id;

        // Prepare user update data
        const userUpdateData: any = {
          updatedBy: technicianData.updatedBy
        };

        // Update user fields if provided
        if (userAccountData.firstName !== undefined) userUpdateData.firstName = userAccountData.firstName;
        if (userAccountData.lastName !== undefined) userUpdateData.lastName = userAccountData.lastName;
        if (userAccountData.email !== undefined) userUpdateData.email = userAccountData.email;

        // Always ensure roles is only TECHNICIAN
        userUpdateData.roles = await this.getRoleIds(['TECHNICIAN']);

        // Handle password update if provided
        if (userAccountData.password) {
          userUpdateData.password = userAccountData.password;
        }

        // Update the user
        await this.usersService.update(userId, userUpdateData, accountId);
      }
    }

    // Remove address and userAccount from technicianData since we've handled them separately
    const { address: techAddress, userAccount: techUserAccount, ...cleanTechnicianData } = technicianData;

    return this.technicianModel
      .findOneAndUpdate(query, cleanTechnicianData, { new: true })
      .populate('account', 'name id')
      .populate('address')
      .populate('user', 'email firstName lastName')
      .exec();
  }

  async delete(id: string, accountId: string): Promise<Technician | null> {
    const query = { _id: id, account: accountId };

    // First, get the technician to find the associated user
    const technician = await this.technicianModel.findOne(query).exec();

    // If technician has an associated user, delete the user as well
    if (technician && technician.user) {
      await this.usersService.delete(technician.user.toString(), accountId);
    }

    // Delete the technician
    return this.technicianModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: string): Promise<any> {
    // First, find all technicians for this account to get their user IDs
    const technicians = await this.technicianModel.find({ account: accountId }).exec();

    // Delete associated users
    for (const technician of technicians) {
      if (technician.user) {
        await this.usersService.delete(technician.user.toString(), accountId);
      }
    }

    // Delete all technicians
    return this.technicianModel.deleteMany({ account: accountId }).exec();
  }

  async findByIdAndAccount(id: string, accountId: string): Promise<TechnicianDocument | null> {
    return this.technicianModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('address')
      .populate('user', 'email firstName lastName')
      .exec();
  }

  async findByUserId(userId: string): Promise<TechnicianDocument | null> {
    return this.technicianModel
      .findOne({ user: new Types.ObjectId(userId) })
      .populate('account', 'name id')
      .populate('address')
      .exec();
  }

  async findOneByCpfAndAccount(cpf: string, accountId: string): Promise<TechnicianDocument | null> {
    return this.technicianModel
      .findOne({
        cpf: cpf,
        account: accountId
      })
      .populate('account', 'name id')
      .populate('address')
      .exec();
  }
}
