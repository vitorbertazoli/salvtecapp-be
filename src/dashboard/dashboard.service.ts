import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Event, EventDocument } from '../events/schemas/event.schema';
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
    @InjectModel(Event.name) private eventModel: Model<EventDocument>
  ) {}

  async getStats(accountId: string) {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const accountObjId = accountId;

    // Get all stats in parallel
    const [customerCount, technicianCount, openQuotesCount, openServiceOrdersCount, todaysEventsCount, monthlySalesData] = await Promise.all([
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

      // Get monthly sales data (accepted quotes from last 30 days)
      this.getMonthlySalesData(accountId, thirtyDaysAgo)
    ]);

    return {
      customerCount,
      technicianCount,
      openQuotesCount,
      openServiceOrdersCount,
      todaysEventsCount,
      monthlySalesData
    };
  }

  private async getMonthlySalesData(accountId: string, fromDate: Date) {
    const salesData = await this.serviceOrderModel.aggregate([
      {
        $match: {
          account: accountId,
          status: 'completed',
          paymentStatus: 'paid',
          completedAt: { $gte: fromDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$completedAt'
            }
          },
          total: { $sum: '$totalValue' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fill in missing dates with 0 values
    const result: { date: string; sales: number }[] = [];
    const currentDate = new Date(fromDate);

    while (currentDate <= new Date()) {
      const dateString = currentDate.toISOString().split('T')[0];
      const existingData = salesData.find((item) => item._id === dateString);

      result.push({
        date: dateString,
        sales: existingData ? existingData.total : 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }
}
