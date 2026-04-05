import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { PaymentOrder, PaymentOrderDocument } from '../payments/schemas/payment-order.schema';
import { ServiceOrder, ServiceOrderDocument } from '../service-orders/schemas/service-order.schema';
import { GetMonthlyBalanceReportDto } from './dto/get-monthly-balance-report.dto';
import { GetSoldItemsReportDto } from './dto/get-sold-items-report.dto';

type MonthlyReportRow = {
  month: string;
  paymentsTotal: number;
  expensesTotal: number;
  balance: number;
};

type ReportSummary = {
  totalReceived: number;
  totalExpenses: number;
  netBalance: number;
  bestMonth: MonthlyReportRow | null;
  worstMonth: MonthlyReportRow | null;
};

type SoldItemType = 'service' | 'product';

type SoldItemRow = {
  itemId: string;
  itemType: SoldItemType;
  itemName: string;
  quantitySold: number;
  salesCount: number;
  totalValue: number;
  minUnitValue: number;
  maxUnitValue: number;
  avgUnitValue: number;
};

type SoldItemTypeSummary = {
  quantitySold: number;
  salesCount: number;
  totalValue: number;
  minUnitValue: number | null;
  maxUnitValue: number | null;
  avgUnitValue: number;
};

type MonthlySoldItemsRow = {
  month: string;
  services: SoldItemTypeSummary;
  products: SoldItemTypeSummary;
  items: SoldItemRow[];
};

type SoldItemsSummary = {
  totalMonths: number;
  services: SoldItemTypeSummary;
  products: SoldItemTypeSummary;
};

type SoldItemAggregateRow = {
  month: string;
  itemId: Types.ObjectId;
  itemType: SoldItemType;
  itemName: string;
  quantitySold: number;
  salesCount: number;
  totalValue: number;
  minUnitValue: number;
  maxUnitValue: number;
  avgUnitValue: number;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(PaymentOrder.name) private readonly paymentOrderModel: Model<PaymentOrderDocument>,
    @InjectModel(ServiceOrder.name) private readonly serviceOrderModel: Model<ServiceOrderDocument>
  ) {}

  async getMonthlyBalance(accountId: Types.ObjectId, query: GetMonthlyBalanceReportDto): Promise<{ monthly: MonthlyReportRow[]; summary: ReportSummary }> {
    const [expenseRows, paymentRows] = await Promise.all([this.getExpensesByMonth(accountId), this.getPaymentsByMonth(accountId)]);

    const monthlyMap = new Map<string, MonthlyReportRow>();

    for (const row of expenseRows) {
      monthlyMap.set(row.month, {
        month: row.month,
        paymentsTotal: 0,
        expensesTotal: row.total,
        balance: -row.total
      });
    }

    for (const row of paymentRows) {
      const existing = monthlyMap.get(row.month);
      if (existing) {
        existing.paymentsTotal = row.total;
        existing.balance = existing.paymentsTotal - existing.expensesTotal;
      } else {
        monthlyMap.set(row.month, {
          month: row.month,
          paymentsTotal: row.total,
          expensesTotal: 0,
          balance: row.total
        });
      }
    }

    let monthly = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    if (query.startMonth) {
      monthly = monthly.filter((item) => item.month >= query.startMonth!);
    }

    if (query.endMonth) {
      monthly = monthly.filter((item) => item.month <= query.endMonth!);
    }

    const totalReceived = monthly.reduce((sum, item) => sum + item.paymentsTotal, 0);
    const totalExpenses = monthly.reduce((sum, item) => sum + item.expensesTotal, 0);
    const netBalance = totalReceived - totalExpenses;

    let bestMonth: MonthlyReportRow | null = null;
    let worstMonth: MonthlyReportRow | null = null;

    for (const month of monthly) {
      if (!bestMonth || month.balance > bestMonth.balance) {
        bestMonth = month;
      }

      if (!worstMonth || month.balance < worstMonth.balance) {
        worstMonth = month;
      }
    }

    return {
      monthly,
      summary: {
        totalReceived,
        totalExpenses,
        netBalance,
        bestMonth,
        worstMonth
      }
    };
  }

  private async getExpensesByMonth(accountId: Types.ObjectId): Promise<Array<{ month: string; total: number }>> {
    const rows = await this.expenseModel.aggregate([
      { $match: { account: accountId } },
      {
        $addFields: {
          expenseDateObj: {
            $dateFromString: {
              dateString: '$expenseDate',
              format: '%Y/%m/%d',
              onError: null,
              onNull: null
            }
          }
        }
      },
      { $match: { expenseDateObj: { $ne: null } } },
      {
        $group: {
          _id: {
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: '$expenseDateObj'
              }
            }
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          total: 1
        }
      },
      { $sort: { month: 1 } }
    ]);

    return rows;
  }

  private async getPaymentsByMonth(accountId: Types.ObjectId): Promise<Array<{ month: string; total: number }>> {
    const rows = await this.paymentOrderModel.aggregate([
      { $match: { account: accountId } },
      { $unwind: '$payments' },
      {
        $match: {
          'payments.paymentDate': { $ne: null },
          'payments.amount': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: {
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: '$payments.paymentDate'
              }
            }
          },
          total: { $sum: '$payments.amount' }
        }
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          total: 1
        }
      },
      { $sort: { month: 1 } }
    ]);

    return rows;
  }

  async getSoldItemsByMonth(accountId: Types.ObjectId, query: GetSoldItemsReportDto): Promise<{ monthly: MonthlySoldItemsRow[]; summary: SoldItemsSummary }> {
    const { startDate, endDate } = this.resolvePeriod(query);

    const rows = await this.getSoldItemsRows(accountId, startDate, endDate);
    const monthlyMap = new Map<string, MonthlySoldItemsRow>();

    for (const row of rows) {
      const monthData = monthlyMap.get(row.month) ?? {
        month: row.month,
        services: this.createEmptyTypeSummary(),
        products: this.createEmptyTypeSummary(),
        items: []
      };

      const item: SoldItemRow = {
        itemId: row.itemId.toString(),
        itemType: row.itemType,
        itemName: row.itemName,
        quantitySold: row.quantitySold,
        salesCount: row.salesCount,
        totalValue: row.totalValue,
        minUnitValue: row.minUnitValue,
        maxUnitValue: row.maxUnitValue,
        avgUnitValue: row.avgUnitValue
      };

      monthData.items.push(item);
      this.mergeTypeSummary(monthData[row.itemType === 'service' ? 'services' : 'products'], item);

      monthlyMap.set(row.month, monthData);
    }

    const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    const summary = this.buildSoldItemsSummary(monthly);

    return {
      monthly,
      summary
    };
  }

  private async getSoldItemsRows(accountId: Types.ObjectId, startDate: Date, endDate: Date): Promise<SoldItemAggregateRow[]> {
    return this.serviceOrderModel.aggregate<SoldItemAggregateRow>([
      {
        $match: {
          account: accountId,
          status: { $in: ['completed', 'payment_order_created'] },
          completedAt: {
            $ne: null,
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.type': { $in: ['service', 'product'] },
          'items.unitValue': { $ne: null },
          'items.quantity': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: {
            month: {
              $dateToString: {
                format: '%Y-%m',
                date: '$completedAt',
                timezone: 'UTC'
              }
            },
            itemId: '$items.itemId',
            itemType: '$items.type',
            itemName: '$items.name'
          },
          quantitySold: { $sum: '$items.quantity' },
          salesCount: { $sum: 1 },
          totalValue: { $sum: '$items.totalValue' },
          minUnitValue: { $min: '$items.unitValue' },
          maxUnitValue: { $max: '$items.unitValue' },
          avgUnitValue: { $avg: '$items.unitValue' }
        }
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          itemId: '$_id.itemId',
          itemType: '$_id.itemType',
          itemName: '$_id.itemName',
          quantitySold: 1,
          salesCount: 1,
          totalValue: 1,
          minUnitValue: 1,
          maxUnitValue: 1,
          avgUnitValue: 1
        }
      },
      { $sort: { month: 1, itemType: 1, itemName: 1 } }
    ]);
  }

  private createEmptyTypeSummary(): SoldItemTypeSummary {
    return {
      quantitySold: 0,
      salesCount: 0,
      totalValue: 0,
      minUnitValue: null,
      maxUnitValue: null,
      avgUnitValue: 0
    };
  }

  private mergeTypeSummary(target: SoldItemTypeSummary, item: SoldItemRow): void {
    target.quantitySold += item.quantitySold;
    target.salesCount += item.salesCount;
    target.totalValue += item.totalValue;

    target.minUnitValue = target.minUnitValue === null ? item.minUnitValue : Math.min(target.minUnitValue, item.minUnitValue);
    target.maxUnitValue = target.maxUnitValue === null ? item.maxUnitValue : Math.max(target.maxUnitValue, item.maxUnitValue);

    if (target.salesCount > 0) {
      const weightedSum = target.avgUnitValue * (target.salesCount - item.salesCount) + item.avgUnitValue * item.salesCount;
      target.avgUnitValue = weightedSum / target.salesCount;
    }
  }

  private buildSoldItemsSummary(monthly: MonthlySoldItemsRow[]): SoldItemsSummary {
    const summary: SoldItemsSummary = {
      totalMonths: monthly.length,
      services: this.createEmptyTypeSummary(),
      products: this.createEmptyTypeSummary()
    };

    for (const month of monthly) {
      this.mergeMonthlyTypeSummary(summary.services, month.services);
      this.mergeMonthlyTypeSummary(summary.products, month.products);
    }

    return summary;
  }

  private mergeMonthlyTypeSummary(target: SoldItemTypeSummary, source: SoldItemTypeSummary): void {
    if (source.salesCount <= 0) {
      return;
    }

    const previousSalesCount = target.salesCount;

    target.quantitySold += source.quantitySold;
    target.salesCount += source.salesCount;
    target.totalValue += source.totalValue;

    target.minUnitValue = target.minUnitValue === null ? source.minUnitValue : Math.min(target.minUnitValue, source.minUnitValue ?? target.minUnitValue);
    target.maxUnitValue = target.maxUnitValue === null ? source.maxUnitValue : Math.max(target.maxUnitValue, source.maxUnitValue ?? target.maxUnitValue);

    const weightedSum = target.avgUnitValue * previousSalesCount + source.avgUnitValue * source.salesCount;
    target.avgUnitValue = weightedSum / target.salesCount;
  }

  private resolvePeriod(query: GetSoldItemsReportDto): { startDate: Date; endDate: Date } {
    if (!query.startMonth && !query.endMonth) {
      return this.getCurrentMonthPeriod();
    }

    const startDate = query.startMonth ? this.toStartOfMonthUtc(query.startMonth) : new Date(0);
    const endDate = query.endMonth ? this.toEndOfMonthUtc(query.endMonth) : new Date('9999-12-31T23:59:59.999Z');

    return {
      startDate,
      endDate
    };
  }

  private getCurrentMonthPeriod(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - 1);

    return {
      startDate,
      endDate
    };
  }

  private toStartOfMonthUtc(value: string): Date {
    const [year, month] = value.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  }

  private toEndOfMonthUtc(value: string): Date {
    const [year, month] = value.split('-').map(Number);

    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - 1);
  }
}
