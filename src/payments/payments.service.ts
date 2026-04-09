import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contract, ContractDocument } from '../contracts/schemas/contract.schema';
import { ServiceOrder } from '../service-orders/schemas/service-order.schema';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { SimulateContractPaymentsDto } from './dto/simulate-contract-payments.dto';
import { UpdatePaymentOrderDto } from './dto/update-payment-order.dto';
import { PaymentOrder, PaymentOrderDocument, PaymentTransaction } from './schemas/payment-order.schema';

type ContractPaymentFrequency = 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual';

type ContractPaymentScheduleInput = {
  startDate: Date | string;
  expireDate: Date | string;
  firstPaymentDate?: Date | string;
  frequency?: ContractPaymentFrequency;
  paymentFrequency?: ContractPaymentFrequency;
  value: number;
  amountToDeduct?: number;
};

type BuiltContractPaymentSchedule = {
  startDate: Date;
  expireDate: Date;
  frequency: ContractPaymentFrequency;
  dueDates: Date[];
  installmentAmounts: number[];
  totalInstallments: number;
  netContractTotal: number;
};

type SimulatedContractInstallment = {
  installmentNumber: number;
  totalInstallments: number;
  dueDate: Date;
  totalAmount: number;
  periodStart: Date;
  periodEnd: Date;
};

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(PaymentOrder.name) private paymentOrderModel: Model<PaymentOrderDocument>,
    @InjectModel(ServiceOrder.name) private serviceOrderModel: Model<ServiceOrder>,
    @InjectModel(Contract.name) private contractModel: Model<ContractDocument>,
    private serviceOrdersService: ServiceOrdersService
  ) {}

  private addMonthsPreservingDay(date: Date, months: number): Date {
    const next = new Date(date);
    const originalDay = next.getDate();

    next.setDate(1);
    next.setMonth(next.getMonth() + months);

    const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDayOfMonth));

    return next;
  }

  private incrementDate(date: Date, frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual'): Date {
    if (frequency === 'monthly') {
      return this.addMonthsPreservingDay(date, 1);
    }

    if (frequency === 'bimonthly') {
      return this.addMonthsPreservingDay(date, 2);
    }

    if (frequency === 'quarterly') {
      return this.addMonthsPreservingDay(date, 3);
    }

    if (frequency === 'biannual') {
      return this.addMonthsPreservingDay(date, 6);
    }

    return this.addMonthsPreservingDay(date, 12);
  }

  private generateContractDueDates(firstPaymentDate: Date, expireDate: Date, frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'biannual' | 'annual'): Date[] {
    const dueDates: Date[] = [];
    let cursor = new Date(firstPaymentDate);

    while (cursor <= expireDate) {
      dueDates.push(new Date(cursor));

      if (dueDates.length > 240) {
        throw new BadRequestException('payments.errors.tooManyInstallments');
      }

      cursor = this.incrementDate(cursor, frequency);
    }

    return dueDates;
  }

  private splitTotalIntoInstallments(totalAmount: number, installments: number): number[] {
    if (installments <= 0) {
      return [];
    }

    const totalCents = Math.round(totalAmount * 100);
    const baseInstallmentCents = Math.floor(totalCents / installments);
    const remainderCents = totalCents % installments;

    return Array.from({ length: installments }, (_, index) => {
      const cents = baseInstallmentCents + (index < remainderCents ? 1 : 0);
      return cents / 100;
    });
  }

  private getTotalPaidFromPaymentOrders(paymentOrders: Array<{ payments?: PaymentTransaction[] }>): number {
    return paymentOrders.reduce((totalPaid, paymentOrder) => {
      const orderPaid = (paymentOrder.payments || []).reduce((orderTotal, payment) => orderTotal + Number(payment.amount || 0), 0);
      return totalPaid + orderPaid;
    }, 0);
  }

  private getExpectedTotalFromPaymentOrder(paymentOrder: { totalAmount?: number; discountAmount?: number; taxAmount?: number }): number {
    const totalAmount = Number(paymentOrder.totalAmount || 0);
    const discountAmount = Number(paymentOrder.discountAmount || 0);
    const taxAmount = Number(paymentOrder.taxAmount || 0);
    return totalAmount - discountAmount + taxAmount;
  }

  private toCents(value: number): number {
    return Math.round(Number(value || 0) * 100);
  }

  private hasMatchingAmounts(left: number, right: number): boolean {
    return this.toCents(left) === this.toCents(right);
  }

  private buildContractPaymentSchedule(input: ContractPaymentScheduleInput): BuiltContractPaymentSchedule {
    const startDate = new Date(input.startDate);
    const expireDate = new Date(input.expireDate);
    const frequency = input.paymentFrequency || input.frequency;

    if (!frequency || Number.isNaN(startDate.getTime()) || Number.isNaN(expireDate.getTime())) {
      throw new BadRequestException('payments.errors.contractMissingPaymentData');
    }

    const firstPaymentDate = input.firstPaymentDate ? new Date(input.firstPaymentDate) : new Date(startDate);
    if (Number.isNaN(firstPaymentDate.getTime())) {
      throw new BadRequestException('payments.errors.contractMissingPaymentData');
    }

    if (firstPaymentDate > expireDate) {
      throw new BadRequestException('payments.errors.invalidContractDateRange');
    }

    const amountToDeduct = Number(input.amountToDeduct || 0);
    const netContractTotal = Math.max(Number(input.value) - amountToDeduct, 0);
    if (netContractTotal <= 0) {
      return {
        startDate,
        expireDate,
        frequency,
        dueDates: [],
        installmentAmounts: [],
        totalInstallments: 0,
        netContractTotal: 0
      };
    }

    const dueDates = this.generateContractDueDates(new Date(firstPaymentDate), new Date(expireDate), frequency);
    if (dueDates.length === 0) {
      throw new BadRequestException('payments.errors.invalidContractPaymentSchedule');
    }

    const totalInstallments = dueDates.length;
    const installmentAmounts = this.splitTotalIntoInstallments(netContractTotal, totalInstallments);

    return {
      startDate,
      expireDate,
      frequency,
      dueDates,
      installmentAmounts,
      totalInstallments,
      netContractTotal
    };
  }

  private buildPaymentInstallmentsFromSchedule(schedule: BuiltContractPaymentSchedule): SimulatedContractInstallment[] {
    let previousPeriodEnd = new Date(schedule.startDate);

    return schedule.dueDates.map((dueDate, index) => {
      const periodStart = index === 0 ? new Date(schedule.startDate) : new Date(previousPeriodEnd);

      // Keep period windows contiguous; when dueDate is not ahead of the current period start,
      // fall back to one frequency step to avoid duplicate ranges.
      const fallbackPeriodEnd = this.incrementDate(new Date(periodStart), schedule.frequency);
      let periodEnd = dueDate > periodStart ? new Date(dueDate) : fallbackPeriodEnd;

      if (periodEnd > schedule.expireDate) {
        periodEnd = new Date(schedule.expireDate);
      }

      if (periodEnd < periodStart) {
        periodEnd = new Date(periodStart);
      }

      previousPeriodEnd = new Date(periodEnd);

      return {
        installmentNumber: index + 1,
        totalInstallments: schedule.totalInstallments,
        dueDate,
        totalAmount: schedule.installmentAmounts[index],
        periodStart,
        periodEnd
      };
    });
  }

  simulateContractPayments(simulationData: SimulateContractPaymentsDto): {
    frequency: ContractPaymentFrequency;
    contractValue: number;
    netContractValue: number;
    totalInstallments: number;
    installments: SimulatedContractInstallment[];
  } {
    const schedule = this.buildContractPaymentSchedule({
      startDate: simulationData.startDate,
      expireDate: simulationData.expireDate,
      firstPaymentDate: simulationData.firstPaymentDate,
      frequency: simulationData.frequency,
      paymentFrequency: simulationData.paymentFrequency,
      value: Number(simulationData.value),
      amountToDeduct: simulationData.amountToDeduct
    });

    return {
      frequency: schedule.frequency,
      contractValue: Number(simulationData.value),
      netContractValue: schedule.netContractTotal,
      totalInstallments: schedule.totalInstallments,
      installments: this.buildPaymentInstallmentsFromSchedule(schedule)
    };
  }

  async findByContract(
    accountId: Types.ObjectId,
    contractId: string
  ): Promise<{
    paymentOrders: PaymentOrder[];
    contractValue: number;
    totalScheduled: number;
    totalPaid: number;
    totalRemaining: number;
  }> {
    const contract = await this.contractModel.findOne({ account: accountId, _id: contractId }).select('_id value').exec();
    if (!contract) {
      throw new NotFoundException('payments.errors.contractNotFound');
    }

    const paymentOrders = await this.paymentOrderModel
      .find({ account: accountId, contract: contract._id })
      .sort({ installmentNumber: 1, dueDate: 1, createdAt: 1 })
      .exec();

    const totalScheduled = paymentOrders.reduce((sum, paymentOrder) => sum + this.getExpectedTotalFromPaymentOrder(paymentOrder), 0);
    const totalPaidFromTransactions = this.getTotalPaidFromPaymentOrders(paymentOrders);
    const inferredPaidFromScheduleGap = paymentOrders.length > 0 ? Math.max(Number(contract.value) - totalScheduled, 0) : 0;
    const totalPaid = Math.max(totalPaidFromTransactions, inferredPaidFromScheduleGap);
    const totalRemaining = Math.max(Number(contract.value) - totalPaid, 0);

    return {
      paymentOrders,
      contractValue: Number(contract.value || 0),
      totalScheduled,
      totalPaid,
      totalRemaining
    };
  }

  async createFromServiceOrder(accountId: Types.ObjectId, serviceOrderId: string, userId: Types.ObjectId): Promise<PaymentOrder> {
    const serviceOrder = await this.serviceOrderModel.findOne({ account: accountId, _id: serviceOrderId }).exec();
    if (!serviceOrder) {
      throw new NotFoundException('payments.errors.serviceOrderNotFound');
    }

    const paymentOrder = new this.paymentOrderModel({
      account: serviceOrder.account,
      customer: serviceOrder.customer,
      serviceOrder: serviceOrder._id,
      paymentStatus: 'pending',
      payments: [], // Initialize empty payments array
      totalAmount: serviceOrder.totalValue,
      createdBy: userId,
      updatedBy: userId
    });

    const savedPaymentOrder = await paymentOrder.save();

    // Update service order status
    await this.serviceOrdersService.updateByAccount(serviceOrderId, { status: 'payment_order_created' }, accountId);

    return savedPaymentOrder;
  }

  async createFromContract(
    accountId: Types.ObjectId,
    contractId: string,
    userId: Types.ObjectId,
    options?: { amountToDeduct?: number }
  ): Promise<PaymentOrder[]> {
    const contract = await this.contractModel.findOne({ account: accountId, _id: contractId }).exec();
    if (!contract) {
      throw new NotFoundException('payments.errors.contractNotFound');
    }

    const existingPaymentOrders = await this.paymentOrderModel.countDocuments({ account: accountId, contract: contract._id }).exec();
    if (existingPaymentOrders > 0) {
      throw new BadRequestException('payments.errors.paymentOrdersAlreadyGenerated');
    }

    const schedule = this.buildContractPaymentSchedule({
      startDate: contract.startDate,
      expireDate: contract.expireDate,
      firstPaymentDate: contract.firstPaymentDate,
      frequency: contract.frequency as ContractPaymentFrequency,
      paymentFrequency: contract.paymentFrequency as ContractPaymentFrequency,
      value: Number(contract.value),
      amountToDeduct: options?.amountToDeduct
    });

    if (schedule.totalInstallments <= 0) {
      return [];
    }

    const installments = this.buildPaymentInstallmentsFromSchedule(schedule);
    const paymentOrdersData = installments.map((installment) => {
      return {
        account: contract.account,
        customer: contract.customer,
        contract: contract._id,
        paymentStatus: 'pending' as const,
        payments: [],
        totalAmount: installment.totalAmount,
        dueDate: installment.dueDate,
        installmentNumber: installment.installmentNumber,
        totalInstallments: installment.totalInstallments,
        periodStart: installment.periodStart,
        periodEnd: installment.periodEnd,
        createdBy: userId,
        updatedBy: userId
      };
    });

    const createdPaymentOrders = await this.paymentOrderModel.insertMany(paymentOrdersData);
    return createdPaymentOrders as PaymentOrder[];
  }

  async regenerateFromContract(accountId: Types.ObjectId, contractId: string, userId: Types.ObjectId): Promise<PaymentOrder[]> {
    const contractObjectId = new Types.ObjectId(contractId);
    const existingPaymentOrders = await this.paymentOrderModel.find({ account: accountId, contract: contractObjectId }).select('paymentStatus payments').exec();

    if (existingPaymentOrders.length === 0) {
      return [];
    }

    const totalAlreadyPaid = this.getTotalPaidFromPaymentOrders(existingPaymentOrders);

    if (existingPaymentOrders.length > 0) {
      await this.deleteAllByContract(accountId, contractObjectId);
    }

    return this.createFromContract(accountId, contractId, userId, { amountToDeduct: totalAlreadyPaid });
  }

  async findAll(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    statuses: string[] = []
  ): Promise<{ data: PaymentOrder[]; total: number }> {
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions: any = { account: accountId };
    const allowedStatuses = statuses.filter((status) => ['pending', 'partial', 'paid', 'refunded'].includes(status));
    if (allowedStatuses.length > 0) {
      matchConditions.paymentStatus = { $in: allowedStatuses };
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchConditions },
      // Convert customer string ID to ObjectId for lookup
      {
        $addFields: {
          customer: {
            $cond: {
              if: { $and: [{ $ne: ['$customer', null] }, { $ne: ['$customer', ''] }] },
              then: { $toObjectId: '$customer' },
              else: null
            }
          }
        }
      },
      // Join with customers collection
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    ];

    // Add search filter if search term is provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { invoiceNumber: { $regex: search, $options: 'i' } },
            { notes: { $regex: search, $options: 'i' } },
            { 'customer.name': { $regex: search, $options: 'i' } },
            { 'customer.email': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add sorting, pagination
    pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit });

    // Get total count
    let total: number;
    if (!search) {
      total = await this.paymentOrderModel.countDocuments(matchConditions).exec();
    } else {
      const countPipeline = [...pipeline];
      countPipeline.splice(countPipeline.length - 2, 2, { $count: 'total' });
      const countResult = await this.paymentOrderModel.aggregate(countPipeline).exec();
      total = countResult.length > 0 ? countResult[0].total : 0;
    }

    const data = await this.paymentOrderModel.aggregate(pipeline).exec();

    return { data, total };
  }

  async findOne(id: string, accountId: Types.ObjectId): Promise<PaymentOrder> {
    const paymentOrder = await this.paymentOrderModel
      .findOne({ _id: id, account: accountId })
      .populate('customer', 'name email')
      .populate('serviceOrder', 'orderNumber description totalValue completedAt status items otherDiscounts')
      .populate('contract', 'startDate expireDate status value frequency paymentFrequency firstPaymentDate')
      .populate('serviceOrder.items.itemId')
      .exec();
    if (!paymentOrder) {
      throw new NotFoundException('payments.errors.paymentOrderNotFound');
    }
    return paymentOrder;
  }

  async remove(id: string, accountId: Types.ObjectId): Promise<void> {
    const result = await this.paymentOrderModel.findOneAndDelete({ _id: id, account: accountId }).exec();
    if (!result) {
      throw new NotFoundException('payments.errors.paymentOrderNotFound');
    }

    // Update the associated service order status back to completed
    if (result.serviceOrder) {
      await this.serviceOrdersService.updateByAccount(result.serviceOrder.toString(), { status: 'completed' }, accountId);
    }
  }

  async update(id: string, accountId: Types.ObjectId, updateData: UpdatePaymentOrderDto, userId: Types.ObjectId): Promise<PaymentOrder> {
    const paymentOrder = await this.paymentOrderModel.findOne({ _id: id, account: accountId }).exec();
    if (!paymentOrder) {
      throw new NotFoundException('payments.errors.paymentOrderNotFound');
    }

    const updateFields: any = { updatedBy: userId };

    // Handle adding new payment transactions
    if (updateData.addPayments && updateData.addPayments.length > 0) {
      const newPayments: PaymentTransaction[] = updateData.addPayments.map((payment) => ({
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
        notes: payment.notes,
        recordedBy: userId
      }));

      // Add new payments to existing payments array
      updateFields.$push = { payments: { $each: newPayments } };
    }

    // Update other fields
    const allowedFields = ['dueDate', 'invoiceNumber', 'notes', 'discountAmount', 'taxAmount'];
    for (const field of allowedFields) {
      if (updateData[field as keyof UpdatePaymentOrderDto] !== undefined) {
        updateFields[field] = updateData[field as keyof UpdatePaymentOrderDto];
      }
    }

    const updatedPaymentOrder = await this.paymentOrderModel
      .findOneAndUpdate({ _id: id, account: accountId }, updateFields, { new: true })
      .populate('customer', 'name email')
      .populate('serviceOrder', 'orderNumber description totalValue completedAt status items')
      .populate('serviceOrder.items.itemId')
      .exec();

    if (!updatedPaymentOrder) {
      throw new NotFoundException('payments.errors.paymentOrderNotFound');
    }

    // Always auto-calculate status from payment and discount totals.
    const totalPaid = updatedPaymentOrder.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const totalPaidWithDiscount = totalPaid + (updatedPaymentOrder.discountAmount || 0);

    let newStatus: 'pending' | 'partial' | 'paid' = 'pending';
    if (this.hasMatchingAmounts(totalPaidWithDiscount, updatedPaymentOrder.totalAmount)) {
      newStatus = 'paid';
    } else if (totalPaidWithDiscount > 0) {
      newStatus = 'partial';
    }

    // Update status if it changed
    if (newStatus !== updatedPaymentOrder.paymentStatus) {
      updatedPaymentOrder.paymentStatus = newStatus;
      await updatedPaymentOrder.save();
    }

    return updatedPaymentOrder;
  }

  async deleteAllByAccount(accountId: Types.ObjectId): Promise<any> {
    return this.paymentOrderModel.deleteMany({ account: accountId }).exec();
  }

  async deleteAllByContract(accountId: Types.ObjectId, contractId: Types.ObjectId): Promise<any> {
    return this.paymentOrderModel.deleteMany({ account: accountId, contract: contractId }).exec();
  }
}
