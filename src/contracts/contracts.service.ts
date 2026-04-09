import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { promises as fs } from 'fs';
import { Model, Types } from 'mongoose';
import { join } from 'path';
import { CustomersService } from '../customers/customers.service';
import { PaymentsService } from '../payments/payments.service';
import { Contract, ContractDocument } from './schemas/contract.schema';

type ContractServiceItemData = {
  service: Types.ObjectId;
  quantity: number;
  unitValue: number;
};

type ContractChangeSnapshot = {
  startDate: Date;
  expireDate: Date;
  frequency: Contract['frequency'];
  maintenanceFrequency?: Contract['maintenanceFrequency'];
  paymentFrequency?: Contract['paymentFrequency'];
  firstPaymentDate?: Date;
  services: ContractServiceItemData[];
  terms: string;
  value: number;
};

type ContractChangeInput = {
  startDate?: Date;
  expireDate?: Date;
  frequency?: Contract['frequency'];
  maintenanceFrequency?: Contract['maintenanceFrequency'];
  paymentFrequency?: Contract['paymentFrequency'];
  firstPaymentDate?: Date;
  services?: ContractServiceItemData[];
  terms?: string;
  value?: number;
};

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    private readonly customerService: CustomersService,
    private readonly paymentsService: PaymentsService
  ) {}

  private normalizeDate(value?: Date | string | null): number | null {
    if (!value) {
      return null;
    }

    return new Date(value).getTime();
  }

  private normalizeServiceItemServiceId(service: any): Types.ObjectId {
    if (service instanceof Types.ObjectId) {
      return service;
    }

    if (service?._id) {
      return new Types.ObjectId(service._id.toString());
    }

    return new Types.ObjectId(service.toString());
  }

  private normalizeServiceItems(services?: any[]): ContractServiceItemData[] {
    return (services || []).map((item) => ({
      service: this.normalizeServiceItemServiceId(item.service),
      quantity: Number(item.quantity),
      unitValue: Number(item.unitValue)
    }));
  }

  private calculateServicesTotal(services: ContractServiceItemData[]): number {
    return services.reduce((total, item) => total + Number(item.quantity) * Number(item.unitValue), 0);
  }

  private cloneSnapshot(snapshot: ContractChangeSnapshot): ContractChangeSnapshot {
    return {
      startDate: new Date(snapshot.startDate),
      expireDate: new Date(snapshot.expireDate),
      frequency: snapshot.frequency,
      maintenanceFrequency: snapshot.maintenanceFrequency,
      paymentFrequency: snapshot.paymentFrequency,
      firstPaymentDate: snapshot.firstPaymentDate ? new Date(snapshot.firstPaymentDate) : undefined,
      services: snapshot.services.map((serviceItem) => ({
        service: new Types.ObjectId(serviceItem.service.toString()),
        quantity: Number(serviceItem.quantity),
        unitValue: Number(serviceItem.unitValue)
      })),
      terms: snapshot.terms,
      value: Number(snapshot.value)
    };
  }

  private buildSnapshotFromContract(contract: ContractDocument): ContractChangeSnapshot {
    return {
      startDate: new Date(contract.startDate),
      expireDate: new Date(contract.expireDate),
      frequency: contract.frequency,
      maintenanceFrequency: contract.maintenanceFrequency,
      paymentFrequency: contract.paymentFrequency,
      firstPaymentDate: contract.firstPaymentDate ? new Date(contract.firstPaymentDate) : undefined,
      services: this.normalizeServiceItems(contract.services),
      terms: contract.terms,
      value: Number(contract.value)
    };
  }

  private buildSnapshotFromInput(base: ContractChangeSnapshot, input: ContractChangeInput): ContractChangeSnapshot {
    return {
      startDate: input.startDate ? new Date(input.startDate) : new Date(base.startDate),
      expireDate: input.expireDate ? new Date(input.expireDate) : new Date(base.expireDate),
      frequency: input.frequency ?? base.frequency,
      maintenanceFrequency: input.maintenanceFrequency ?? base.maintenanceFrequency,
      paymentFrequency: input.paymentFrequency ?? base.paymentFrequency,
      firstPaymentDate: input.firstPaymentDate ? new Date(input.firstPaymentDate) : base.firstPaymentDate,
      services: input.services ? this.normalizeServiceItems(input.services) : this.normalizeServiceItems(base.services),
      terms: input.terms ?? base.terms,
      value: input.value !== undefined ? Number(input.value) : Number(base.value)
    };
  }

  private areServicesEqual(left: ContractServiceItemData[], right: ContractServiceItemData[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < left.length; index += 1) {
      const leftItem = left[index];
      const rightItem = right[index];
      if (
        leftItem.service.toString() !== rightItem.service.toString() ||
        Number(leftItem.quantity) !== Number(rightItem.quantity) ||
        Number(leftItem.unitValue) !== Number(rightItem.unitValue)
      ) {
        return false;
      }
    }

    return true;
  }

  private hasSnapshotChanges(current: ContractChangeSnapshot, next: ContractChangeSnapshot): boolean {
    return (
      this.normalizeDate(current.startDate) !== this.normalizeDate(next.startDate) ||
      this.normalizeDate(current.expireDate) !== this.normalizeDate(next.expireDate) ||
      current.frequency !== next.frequency ||
      current.maintenanceFrequency !== next.maintenanceFrequency ||
      current.paymentFrequency !== next.paymentFrequency ||
      this.normalizeDate(current.firstPaymentDate) !== this.normalizeDate(next.firstPaymentDate) ||
      current.terms !== next.terms ||
      Number(current.value) !== Number(next.value) ||
      !this.areServicesEqual(current.services, next.services)
    );
  }

  private shouldRegeneratePaymentsForSnapshotChange(current: ContractChangeSnapshot, next: ContractChangeSnapshot): boolean {
    return (
      Number(current.value) !== Number(next.value) ||
      current.frequency !== next.frequency ||
      current.paymentFrequency !== next.paymentFrequency ||
      this.normalizeDate(current.startDate) !== this.normalizeDate(next.startDate) ||
      this.normalizeDate(current.expireDate) !== this.normalizeDate(next.expireDate) ||
      this.normalizeDate(current.firstPaymentDate) !== this.normalizeDate(next.firstPaymentDate)
    );
  }

  async create(contractData: any): Promise<Contract> {
    // search the customer to make sure it exists
    const customer = await this.customerService.findByIdAndAccount(contractData.customer, contractData.account);

    if (!customer) {
      throw new NotFoundException('contracts.customerNotFound');
    }
    contractData.customer = customer;
    const createdContract = new this.contractModel(contractData);
    const savedContract = await createdContract.save();
    return savedContract.toObject() as any;
  }

  async findAll(): Promise<Contract[]> {
    return this.contractModel.find().exec();
  }

  async findByAccount(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    statuses?: string[]
  ): Promise<{
    contracts: Contract[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Use aggregation pipeline to search by customer name
    const pipeline: any[] = [
      { $match: { account: accountId } },
      // Lookup customer information (only name and email)
      {
        $lookup: {
          from: 'customers',
          let: { customerId: '$customer' },
          pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$customerId'] } } }, { $project: { name: 1, email: 1 } }],
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ];

    // Add search filter if search term is provided
    if (search) {
      const searchConditions: any[] = [{ terms: { $regex: search, $options: 'i' } }, { 'customer.name': { $regex: search, $options: 'i' } }];

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
    if (statuses && statuses.length > 0) {
      pipeline.push({ $match: { status: { $in: statuses } } });
    }

    // Add sorting and pagination
    pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit });

    // Get total count with same filtering
    const countPipeline: any[] = [
      { $match: { account: accountId } },
      // Lookup customer information (only name and email)
      {
        $lookup: {
          from: 'customers',
          let: { customerId: '$customer' },
          pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$customerId'] } } }, { $project: { name: 1, email: 1 } }],
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ];

    if (search) {
      const searchConditions: any[] = [{ terms: { $regex: search, $options: 'i' } }, { 'customer.name': { $regex: search, $options: 'i' } }];

      if (Types.ObjectId.isValid(search)) {
        searchConditions.push({ _id: new Types.ObjectId(search) });
      }

      countPipeline.push({
        $match: {
          $or: searchConditions
        }
      });
    }

    if (statuses && statuses.length > 0) {
      countPipeline.push({ $match: { status: { $in: statuses } } });
    }

    countPipeline.push({ $count: 'total' });

    const [contracts, countResult] = await Promise.all([this.contractModel.aggregate(pipeline).exec(), this.contractModel.aggregate(countPipeline).exec()]);

    const total = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      contracts,
      total,
      page,
      limit,
      totalPages
    };
  }

  async findOne(id: string): Promise<Contract | null> {
    return this.contractModel.findById(id).exec();
  }

  async findByIdAndAccount(id: string, accountId: Types.ObjectId): Promise<ContractDocument | null> {
    const contract = await this.contractModel
      .findOne({ _id: id, account: accountId })
      .populate('account', 'name id')
      .populate('customer', 'name email phoneNumber')
      .populate('services.service', 'name description')
      .populate('changeOrders.originalData.services.service', 'name description')
      .populate('changeOrders.modifiedData.services.service', 'name description')
      .populate('changeOrders.createdBy', 'firstName lastName')
      .populate('changeOrders.approvedBy', 'firstName lastName')
      .populate('contractQuote', '_id status startDate expireDate value')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .exec();

    return contract;
  }

  async createChangeOrder(
    contractId: string,
    changeData: ContractChangeInput,
    accountId: Types.ObjectId,
    userId: Types.ObjectId,
    description?: string
  ): Promise<Contract> {
    const contract = await this.contractModel.findOne({ _id: contractId, account: accountId }).exec();

    if (!contract) {
      throw new NotFoundException('contracts.notFound');
    }

    const currentSnapshot = this.buildSnapshotFromContract(contract);
    const modifiedSnapshot = this.buildSnapshotFromInput(currentSnapshot, changeData);

    if (!this.hasSnapshotChanges(currentSnapshot, modifiedSnapshot)) {
      throw new BadRequestException('contracts.changeOrderNoChanges');
    }

    const version = (contract.changeOrders?.length || 0) + 1;

    const changeOrder = {
      version,
      originalData: this.cloneSnapshot(currentSnapshot),
      modifiedData: this.cloneSnapshot(modifiedSnapshot),
      description,
      status: 'pending' as const,
      createdBy: userId,
      createdAt: new Date()
    };

    contract.changeOrders = contract.changeOrders || [];
    contract.changeOrders.push(changeOrder as any);
    contract.updatedBy = userId;
    contract.markModified('changeOrders');

    return contract.save();
  }

  async approveChangeOrder(contractId: string, changeOrderVersion: number, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<Contract> {
    const contract = await this.contractModel.findOne({ _id: contractId, account: accountId }).exec();

    if (!contract) {
      throw new NotFoundException('contracts.notFound');
    }

    const changeOrder = contract.changeOrders?.find((co) => co.version === changeOrderVersion);
    if (!changeOrder) {
      throw new NotFoundException('contracts.changeOrderNotFound');
    }

    if (changeOrder.status !== 'pending') {
      throw new BadRequestException('contracts.changeOrderNotPending');
    }

    const currentSnapshot = this.buildSnapshotFromContract(contract);
    const nextSnapshot = this.buildSnapshotFromInput(currentSnapshot, {
      startDate: changeOrder.modifiedData.startDate,
      expireDate: changeOrder.modifiedData.expireDate,
      frequency: changeOrder.modifiedData.frequency,
      maintenanceFrequency: changeOrder.modifiedData.maintenanceFrequency,
      paymentFrequency: changeOrder.modifiedData.paymentFrequency,
      firstPaymentDate: changeOrder.modifiedData.firstPaymentDate,
      services: this.normalizeServiceItems(changeOrder.modifiedData.services),
      terms: changeOrder.modifiedData.terms,
      value: changeOrder.modifiedData.value
    });
    const approvedServicesValue = this.calculateServicesTotal(nextSnapshot.services);
    nextSnapshot.value = approvedServicesValue;

    changeOrder.status = 'approved';
    changeOrder.approvedAt = new Date();
    changeOrder.approvedBy = userId;
    changeOrder.modifiedData.value = approvedServicesValue;

    contract.startDate = new Date(nextSnapshot.startDate);
    contract.expireDate = new Date(nextSnapshot.expireDate);
    contract.frequency = nextSnapshot.frequency;
    contract.maintenanceFrequency = nextSnapshot.maintenanceFrequency;
    contract.paymentFrequency = nextSnapshot.paymentFrequency;
    contract.firstPaymentDate = nextSnapshot.firstPaymentDate;
    contract.services = this.normalizeServiceItems(nextSnapshot.services) as any;
    contract.terms = nextSnapshot.terms;
    contract.value = approvedServicesValue;
    contract.updatedBy = userId;

    contract.markModified('changeOrders');

    const savedContract = await contract.save();

    if (this.shouldRegeneratePaymentsForSnapshotChange(currentSnapshot, nextSnapshot)) {
      await this.paymentsService.regenerateFromContract(accountId, savedContract._id.toString(), userId);
    }

    return savedContract;
  }

  async rejectChangeOrder(contractId: string, changeOrderVersion: number, accountId: Types.ObjectId, userId: Types.ObjectId): Promise<Contract> {
    const contract = await this.contractModel.findOne({ _id: contractId, account: accountId }).exec();

    if (!contract) {
      throw new NotFoundException('contracts.notFound');
    }

    const changeOrder = contract.changeOrders?.find((co) => co.version === changeOrderVersion);
    if (!changeOrder) {
      throw new NotFoundException('contracts.changeOrderNotFound');
    }

    if (changeOrder.status !== 'pending') {
      throw new BadRequestException('contracts.changeOrderNotPending');
    }

    changeOrder.status = 'rejected';
    changeOrder.approvedAt = new Date();
    changeOrder.approvedBy = userId;
    contract.updatedBy = userId;

    contract.markModified('changeOrders');
    return contract.save();
  }

  async deleteByAccount(id: string, accountId: Types.ObjectId): Promise<Contract | null> {
    const query = { _id: id, account: accountId };
    return this.contractModel.findOneAndDelete(query).exec();
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    const contracts = await this.contractModel.find({ account: accountId }).select('files.url').lean().exec();
    const fileUrls = contracts.flatMap((contract) => contract.files?.map((file) => file.url) || []);

    await Promise.all(
      fileUrls
        .filter((fileUrl): fileUrl is string => Boolean(fileUrl && fileUrl.startsWith('/uploads/')))
        .map(async (fileUrl) => {
          try {
            await fs.unlink(join(process.cwd(), fileUrl));
          } catch (error) {
            console.error(`Failed to delete contract file ${fileUrl}:`, error);
          }
        })
    );

    return this.contractModel.deleteMany({ account: accountId }).exec();
  }
}
