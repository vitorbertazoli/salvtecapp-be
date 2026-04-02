import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { PaymentOrder, PaymentOrderDocument } from '../payments/schemas/payment-order.schema';
import { GetMonthlyBalanceReportDto } from './dto/get-monthly-balance-report.dto';

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

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(PaymentOrder.name) private readonly paymentOrderModel: Model<PaymentOrderDocument>
  ) {}

  async getMonthlyBalance(accountId: Types.ObjectId, query: GetMonthlyBalanceReportDto): Promise<{ monthly: MonthlyReportRow[]; summary: ReportSummary }> {
    const [expenseRows, paymentRows] = await Promise.all([
      this.getExpensesByMonth(accountId),
      this.getPaymentsByMonth(accountId)
    ]);

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
}
