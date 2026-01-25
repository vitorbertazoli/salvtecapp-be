import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ServiceOrder } from '../service-orders/schemas/service-order.schema';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { UpdatePaymentOrderDto } from './dto/update-payment-order.dto';
import { PaymentOrder, PaymentOrderDocument, PaymentTransaction } from './schemas/payment-order.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(PaymentOrder.name) private paymentOrderModel: Model<PaymentOrderDocument>,
    @InjectModel(ServiceOrder.name) private serviceOrderModel: Model<ServiceOrder>,
    private serviceOrdersService: ServiceOrdersService
  ) {}

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

  async findAll(
    accountId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status: string = ''
  ): Promise<{ data: PaymentOrder[]; total: number }> {
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions: any = { account: accountId };
    if (status && ['pending', 'partial', 'paid', 'refunded'].includes(status)) {
      matchConditions.paymentStatus = status;
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
      .populate('serviceOrder', 'orderNumber description totalValue completedAt status')
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
    const allowedFields = ['paymentStatus', 'dueDate', 'invoiceNumber', 'notes', 'discountAmount', 'taxAmount'];
    for (const field of allowedFields) {
      if (updateData[field as keyof UpdatePaymentOrderDto] !== undefined) {
        updateFields[field] = updateData[field as keyof UpdatePaymentOrderDto];
      }
    }

    const updatedPaymentOrder = await this.paymentOrderModel
      .findOneAndUpdate({ _id: id, account: accountId }, updateFields, { new: true })
      .populate('customer', 'name email')
      .populate('serviceOrder', 'orderNumber description totalValue completedAt status')
      .exec();

    if (!updatedPaymentOrder) {
      throw new NotFoundException('payments.errors.paymentOrderNotFound');
    }

    // Calculate total paid amount and update status if not manually set
    const totalPaid = updatedPaymentOrder.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const adjustedTotal = updatedPaymentOrder.totalAmount - (updatedPaymentOrder.discountAmount || 0);

    let newStatus = updatedPaymentOrder.paymentStatus;
    if (!updateData.paymentStatus) {
      // Only auto-update status if not manually set
      if (totalPaid >= adjustedTotal) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      } else {
        newStatus = 'pending';
      }
    }

    // Update status if it changed
    if (newStatus !== updatedPaymentOrder.paymentStatus) {
      updatedPaymentOrder.paymentStatus = newStatus;
      await updatedPaymentOrder.save();
    }

    return updatedPaymentOrder;
  }
}
