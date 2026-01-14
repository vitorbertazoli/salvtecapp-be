import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentOrder, PaymentOrderDocument } from './schemas/payment-order.schema';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { ServiceOrder } from '../service-orders/schemas/service-order.schema';

@Injectable()
export class PaymentsService {
    constructor(
        @InjectModel(PaymentOrder.name) private paymentOrderModel: Model<PaymentOrderDocument>,
        @InjectModel(ServiceOrder.name) private serviceOrderModel: Model<ServiceOrder>,
        private serviceOrdersService: ServiceOrdersService
    ) { }

    async createFromServiceOrder(accountId: Types.ObjectId, serviceOrderId: string): Promise<PaymentOrder> {
        // For now, assume account is not needed, but to get service order, we need to find it without account
        // Since payments might be cross-account, let's fetch directly
        const serviceOrder = await this.serviceOrderModel.findOne({ account: accountId, _id: serviceOrderId }).exec();
        if (!serviceOrder) {
            throw new NotFoundException('Service order not found');
        }

        const paymentOrder = new this.paymentOrderModel({
            account: serviceOrder.account,
            customer: serviceOrder.customer,
            serviceOrder: serviceOrder._id,
            paymentStatus: 'pending',
            paidAmount: 0,
            totalAmount: serviceOrder.totalValue
        });

        const savedPaymentOrder = await paymentOrder.save();

        // Update service order status
        await this.serviceOrdersService.updateByAccount(serviceOrderId, { status: 'payment_order_created' }, accountId);

        return savedPaymentOrder;
    }

    async findAll(accountId: Types.ObjectId, page: number = 1, limit: number = 10): Promise<{ data: PaymentOrder[]; total: number }> {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.paymentOrderModel.find({ account: accountId }).skip(skip).limit(limit).exec(),
            this.paymentOrderModel.countDocuments({ account: accountId }).exec()
        ]);
        return { data, total };
    }

    async findOne(id: string, accountId: Types.ObjectId): Promise<PaymentOrder> {
        const paymentOrder = await this.paymentOrderModel.findOne({ _id: id, account: accountId }).exec();
        if (!paymentOrder) {
            throw new NotFoundException('Payment order not found');
        }
        return paymentOrder;
    }

    async remove(id: string, accountId: Types.ObjectId): Promise<void> {
        const result = await this.paymentOrderModel.findOneAndDelete({ _id: id, account: accountId }).exec();
        if (!result) {
            throw new NotFoundException('Payment order not found');
        }
    }
}
