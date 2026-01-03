import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { Contract, ContractDocument } from './schemas/contract.schema';

@Injectable()
export class ContractsService {
    constructor(
        @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
        private readonly accountsService: AccountsService
    ) { }

    async create(contractData: Partial<Contract>): Promise<Contract> {
        const createdContract = new this.contractModel(contractData);
        const savedContract = await createdContract.save();
        return savedContract.toObject() as any;
    }

    async findAll(): Promise<Contract[]> {
        return this.contractModel.find().exec();
    }

    async findByAccount(
        accountId: string,
        page: number = 1,
        limit: number = 10,
        search: string = '',
        status?: string
    ): Promise<{
        contracts: Contract[];
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
                { terms: { $regex: search, $options: 'i' } },
                { _id: Types.ObjectId.isValid(search) ? search : undefined }
            ];
        }
        if (status) {
            searchQuery.status = status;
        }

        const [contracts, total] = await Promise.all([
            this.contractModel
                .find(searchQuery)
                .populate('account', 'name id')
                .populate('client', 'name email phoneNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.contractModel.countDocuments(searchQuery).exec()
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            contracts: contracts.map((c) => c.toObject()),
            total,
            page,
            limit,
            totalPages
        };
    }

    async findOne(id: string): Promise<Contract | null> {
        return this.contractModel.findById(id).exec();
    }

    async findByIdAndAccount(id: string, accountId: string): Promise<ContractDocument | null> {
        const contract = await this.contractModel
            .findOne({ _id: id, account: accountId })
            .populate('account', 'name id')
            .populate('client', 'name email phoneNumber')
            .exec();

        return contract;
    }

    async update(id: string, contractData: Partial<Contract>): Promise<Contract | null> {
        return this.contractModel.findByIdAndUpdate(id, contractData, { new: true }).exec();
    }

    async updateByAccount(
        id: string,
        contractData: Partial<Contract>,
        accountId: string
    ): Promise<Contract | null> {
        const query = { _id: id, account: accountId };

        const updatedContract = await this.contractModel
            .findOneAndUpdate(query, contractData, { new: true })
            .populate('account', 'name id')
            .populate('client', 'name email phoneNumber')
            .exec();

        return updatedContract;
    }

    async delete(id: string): Promise<Contract | null> {
        return this.contractModel.findByIdAndDelete(id).exec();
    }

    async deleteByAccount(id: string, accountId: string): Promise<Contract | null> {
        const query = { _id: id, account: accountId };
        return this.contractModel.findOneAndDelete(query).exec();
    }

    async deleteAllByAccount(accountId: string): Promise<any> {
        return this.contractModel.deleteMany({ account: accountId }).exec();
    }
}