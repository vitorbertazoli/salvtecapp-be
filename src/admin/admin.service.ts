import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { Types } from 'mongoose';
import { join } from 'path';
import { AccountsService } from '../accounts/accounts.service';
import { AccountDocument } from '../accounts/schemas/account.schema';
import { ContractQuotesService } from '../contract-quotes/contract-quotes.service';
import { ContractsService } from '../contracts/contracts.service';
import { CustomersService } from '../customers/customers.service';
import { EventsService } from '../events/events.service';
import { ExpensesService } from '../expenses/expenses.service';
import { FollowUpsService } from '../follow-ups/follow-ups.service';
import { PaymentsService } from '../payments/payments.service';
import { ProductsService } from '../products/products.service';
import { ProspectingService } from '../prospecting/prospecting.service';
import { QuotesService } from '../quotes/quotes.service';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { ServicesService } from '../services/services.service';
import { TechniciansService } from '../technicians/technicians.service';
import { UsersService } from '../users/users.service';
import { VehicleUsagesService } from '../vehicle-usages/vehicle-usages.service';
import { VehiclesService } from '../vehicles/vehicles.service';

@Injectable()
export class AdminService {
  constructor(
    private accountsService: AccountsService,
    private customersService: CustomersService,
    private usersService: UsersService,
    private productsService: ProductsService,
    private contractQuotesService: ContractQuotesService,
    private quotesService: QuotesService,
    private serviceOrdersService: ServiceOrdersService,
    private servicesService: ServicesService,
    private techniciansService: TechniciansService,
    private eventsService: EventsService,
    private followUpsService: FollowUpsService,
    private contractsService: ContractsService,
    private paymentsService: PaymentsService,
    private expensesService: ExpensesService,
    private vehicleUsagesService: VehicleUsagesService,
    private vehiclesService: VehiclesService,
    private prospectingService: ProspectingService
  ) {}

  private normalizeAccountId(accountId: Types.ObjectId | string): Types.ObjectId {
    if (accountId instanceof Types.ObjectId) {
      return accountId;
    }

    if (!Types.ObjectId.isValid(accountId)) {
      throw new NotFoundException('admin.errors.accountNotFound');
    }

    return new Types.ObjectId(accountId);
  }

  async getAllAccounts(
    page: number = 1,
    limit: number = 10,
    search: string = ''
  ): Promise<{
    accounts: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery: any = {};
    if (search) {
      searchQuery.$or = [{ name: { $regex: search, $options: 'i' } }, { _id: search.match(/^[0-9a-fA-F]{24}$/) ? search : undefined }].filter(Boolean);
    }

    // Get accounts with pagination
    const accounts = (await this.accountsService.findAll()) as (AccountDocument & { createdAt?: Date })[];

    // Apply search filter in memory (since findAll doesn't support search)
    let filteredAccounts = accounts;
    if (search) {
      filteredAccounts = accounts.filter((account) => account.name.toLowerCase().includes(search.toLowerCase()) || account._id.toString().includes(search));
    }

    // Apply pagination
    const total = filteredAccounts.length;
    const paginatedAccounts = filteredAccounts
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(skip, skip + limit);

    const totalPages = Math.ceil(total / limit);

    const formattedAccounts = paginatedAccounts.map((account) => ({
      id: account._id.toString(),
      name: account.name,
      plan: account.plan,
      status: account.status,
      logoUrl: account.logoUrl,
      createdAt: account.createdAt,
      expireDate: account.expireDate
    }));

    return {
      accounts: formattedAccounts,
      total,
      page,
      limit,
      totalPages
    };
  }

  async updateAccountStatus(accountId: string, status: 'pending' | 'active' | 'suspended') {
    const updatedAccount = (await this.accountsService.update(accountId, { status })) as AccountDocument;

    if (!updatedAccount) {
      throw new NotFoundException('admin.errors.accountNotFound');
    }

    return {
      id: updatedAccount._id.toString(),
      name: updatedAccount.name,
      plan: updatedAccount.plan,
      status: updatedAccount.status,
      logoUrl: updatedAccount.logoUrl
    };
  }

  async getAccountSummary(accountId: string) {
    if (!Types.ObjectId.isValid(accountId)) {
      throw new NotFoundException('admin.errors.accountNotFound');
    }

    const accountObjectId = new Types.ObjectId(accountId);
    const account = (await this.accountsService.findOne(accountObjectId)) as AccountDocument | null;

    if (!account) {
      throw new NotFoundException('admin.errors.accountNotFound');
    }

    const [usersByRole, customersData, servicesData, productsData, eventsData, quotesData, serviceOrdersData, paymentOrdersData, expensesData] =
      await Promise.all([
        this.usersService.countByRoleForAccount(accountObjectId),
        this.customersService.findByAccount(accountObjectId, 1, 1),
        this.servicesService.findByAccount(accountObjectId, 1, 1),
        this.productsService.findByAccount(accountObjectId, 1, 1),
        this.eventsService.findAllPaginated(accountObjectId, '1', '1'),
        this.quotesService.findByAccount(accountObjectId, 1, 1),
        this.serviceOrdersService.findByAccount(accountObjectId, 1, 1),
        this.paymentsService.findAll(accountObjectId, 1, 1),
        this.expensesService.findAll(accountObjectId, 1, 1)
      ]);

    return {
      account: {
        id: account._id.toString(),
        name: account.name,
        replyToEmail: account.replyToEmail || ''
      },
      usersByRole,
      totals: {
        customers: customersData.total,
        services: servicesData.total,
        products: productsData.total,
        events: eventsData.total,
        quotes: quotesData.total,
        serviceOrders: serviceOrdersData.total,
        paymentOrders: paymentOrdersData.total,
        expenses: expensesData.total
      }
    };
  }

  async updateAccount(accountId: string, updateData: { status?: 'pending' | 'active' | 'suspended'; replyToEmail?: string; expireDate?: string }) {
    const dataToUpdate: any = {};

    if (updateData.status) {
      dataToUpdate.status = updateData.status;
    }
    if (updateData.replyToEmail !== undefined) {
      dataToUpdate.replyToEmail = updateData.replyToEmail;
    }
    if (updateData.expireDate !== undefined) {
      dataToUpdate.expireDate = updateData.expireDate ? new Date(updateData.expireDate) : null;
    } else {
      dataToUpdate.expireDate = null;
    }

    const updatedAccount = (await this.accountsService.update(accountId, dataToUpdate)) as AccountDocument;

    if (!updatedAccount) {
      throw new NotFoundException('admin.errors.accountNotFound');
    }

    return {
      id: updatedAccount._id.toString(),
      name: updatedAccount.name,
      plan: updatedAccount.plan,
      status: updatedAccount.status,
      logoUrl: updatedAccount.logoUrl,
      replyToEmail: updatedAccount.replyToEmail,
      expireDate: updatedAccount.expireDate
    };
  }

  async deleteAccount(accountId: Types.ObjectId | string) {
    const normalizedAccountId = this.normalizeAccountId(accountId);

    // First verify the account exists
    const account = await this.accountsService.findOne(normalizedAccountId);
    if (!account) {
      throw new NotFoundException('admin.errors.accountNotFound');
    }

    // Perform cascade deletion in dependency-safe order
    // Delete payment orders first (they reference service orders)
    await this.paymentsService.deleteAllByAccount(normalizedAccountId);

    // Delete service orders (they reference customers, services, technicians)
    await this.serviceOrdersService.deleteAllByAccount(normalizedAccountId);

    // Delete expenses
    await this.expensesService.deleteAllByAccount(normalizedAccountId);

    // Delete vehicle usages first (they reference vehicles and technicians)
    await this.vehicleUsagesService.deleteAllByAccount(normalizedAccountId);

    // Delete vehicles
    await this.vehiclesService.deleteAllByAccount(normalizedAccountId);

    // Delete quotes (they reference customers, services)
    await this.quotesService.deleteAllByAccount(normalizedAccountId);

    // Delete contract quotes before contracts/customers they reference
    await this.contractQuotesService.deleteAllByAccount(normalizedAccountId);

    // Delete contracts (they reference customers)
    await this.contractsService.deleteAllByAccount(normalizedAccountId);

    // Delete follow-ups (they reference customers)
    await this.followUpsService.deleteAllByAccount(normalizedAccountId);

    // Delete events (they reference customers, technicians)
    await this.eventsService.deleteAllByAccount(normalizedAccountId);

    // Delete customers (they reference technicians and addresses)
    await this.customersService.deleteAllByAccount(normalizedAccountId);

    // Delete technicians
    await this.techniciansService.deleteAllByAccount(normalizedAccountId);

    // Delete services
    await this.servicesService.deleteAllByAccount(normalizedAccountId);

    // Delete products
    await this.productsService.deleteAllByAccount(normalizedAccountId);

    // Delete prospecting data
    await this.prospectingService.deleteAllByAccount(normalizedAccountId);

    // Delete users
    await this.usersService.deleteAllByAccount(normalizedAccountId);

    // Finally delete the account itself
    const deletedAccount = (await this.accountsService.delete(normalizedAccountId)) as AccountDocument;

    if (!deletedAccount) {
      throw new BadRequestException('admin.errors.failedToDeleteAccount');
    }

    if (deletedAccount.logoUrl?.startsWith('/uploads/')) {
      try {
        await fs.unlink(join(process.cwd(), deletedAccount.logoUrl));
      } catch (error) {
        console.error(`Failed to delete account logo ${deletedAccount.logoUrl}:`, error);
      }
    }

    return {
      id: deletedAccount._id.toString(),
      name: deletedAccount.name,
      message: 'admin.success.accountDeleted'
    };
  }
}
