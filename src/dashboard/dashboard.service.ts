import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { PaymentOrder, PaymentOrderDocument } from '../payments/schemas/payment-order.schema';
import { Quote, QuoteDocument } from '../quotes/schemas/quote.schema';
import { ServiceOrder, ServiceOrderDocument } from '../service-orders/schemas/service-order.schema';
import { Technician, TechnicianDocument } from '../technicians/schemas/technician.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Technician.name) private technicianModel: Model<TechnicianDocument>,
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    @InjectModel(ServiceOrder.name) private serviceOrderModel: Model<ServiceOrderDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(PaymentOrder.name) private paymentOrderModel: Model<PaymentOrderDocument>
  ) {}

  async getStats(accountId: Types.ObjectId, startDate?: string, endDate?: string) {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    // Default to last 30 days if no dates provided
    const defaultEndDate = today;
    const defaultStartDate = new Date();
    defaultStartDate.setDate(today.getDate() - 30);

    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;

    const accountObjId = accountId;

    // Get all stats in parallel
    const [customerCount, technicianCount, openQuotesCount, openServiceOrdersCount, todaysEventsCount, monthlySalesData, paymentStats, expectedRevenue] =
      await Promise.all([
        // Count customers
        this.customerModel.countDocuments({ account: accountObjId }),

        // Count active technicians
        this.technicianModel.countDocuments({ account: accountObjId, status: 'active' }),

        // Count open quotes (not accepted or rejected)
        this.quoteModel.countDocuments({
          account: accountObjId,
          status: { $nin: ['accepted', 'rejected'] }
        }),

        // Count open service orders (not completed or cancelled)
        this.serviceOrderModel.countDocuments({
          account: accountObjId,
          status: { $nin: ['completed', 'cancelled'] }
        }),

        // Count today's scheduled events
        this.eventModel.countDocuments({
          account: accountObjId,
          date: todayString,
          status: 'scheduled'
        }),

        // Get monthly sales data (payments received in the date range)
        this.getMonthlyPaymentData(accountId, start, end),

        // Get payment statistics
        this.getPaymentStats(accountId, start, end),

        // Get expected revenue from open service orders
        this.getExpectedRevenue(accountId, start, end)
      ]);

    return {
      customerCount,
      technicianCount,
      openQuotesCount,
      openServiceOrdersCount,
      todaysEventsCount,
      monthlySalesData,
      ...paymentStats,
      expectedRevenue
    };
  }

  private async getMonthlyPaymentData(accountId: Types.ObjectId, fromDate: Date, toDate: Date) {
    const paymentData = await this.paymentOrderModel.aggregate([
      {
        $match: {
          account: accountId,
          'payments.paymentDate': { $gte: fromDate, $lte: toDate }
        }
      },
      {
        $unwind: '$payments'
      },
      {
        $match: {
          'payments.paymentDate': { $gte: fromDate, $lte: toDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$payments.paymentDate'
            }
          },
          total: { $sum: '$payments.amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fill in missing dates with 0 values
    const result: { date: string; sales: number }[] = [];
    const currentDate = new Date(fromDate);

    while (currentDate <= toDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const existingData = paymentData.find((item) => item._id === dateString);

      result.push({
        date: dateString,
        sales: existingData ? existingData.total : 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  private async getPaymentStats(accountId: Types.ObjectId, fromDate: Date, toDate: Date) {
    const [totalReceived, totalOwed] = await Promise.all([
      // Total amount received in the date range
      this.paymentOrderModel.aggregate([
        {
          $match: {
            account: accountId,
            'payments.paymentDate': { $gte: fromDate, $lte: toDate }
          }
        },
        {
          $unwind: '$payments'
        },
        {
          $match: {
            'payments.paymentDate': { $gte: fromDate, $lte: toDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$payments.amount' }
          }
        }
      ]),

      // Total amount still owed (pending and partial payments due in the date range)
      this.paymentOrderModel.aggregate([
        {
          $match: {
            account: accountId,
            paymentStatus: { $in: ['pending', 'partial'] },
            $or: [{ dueDate: { $gte: fromDate, $lte: toDate } }, { dueDate: { $exists: false }, createdAt: { $gte: fromDate, $lte: toDate } }]
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            paid: { $sum: { $sum: '$payments.amount' } }
          }
        }
      ])
    ]);

    return {
      totalReceived: totalReceived.length > 0 ? totalReceived[0].total : 0,
      totalOwed: totalOwed.length > 0 ? totalOwed[0].total - totalOwed[0].paid : 0
    };
  }

  private async getExpectedRevenue(accountId: Types.ObjectId, fromDate: Date, toDate: Date) {
    const result = await this.serviceOrderModel.aggregate([
      {
        $match: {
          account: accountId,
          status: { $nin: ['completed', 'cancelled'] },
          issuedAt: { $gte: fromDate, $lte: toDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalValue' }
        }
      }
    ]);

    return result.length > 0 ? result[0].total : 0;
  }
}
