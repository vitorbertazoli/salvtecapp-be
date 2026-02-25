import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AccountsService } from '../accounts/accounts.service';
import { AccountDocument } from '../accounts/schemas/account.schema';
import { ContractsService } from '../contracts/contracts.service';
import { CustomersService } from '../customers/customers.service';
import { EventsService } from '../events/events.service';
import { ExpensesService } from '../expenses/expenses.service';
import { FollowUpsService } from '../follow-ups/follow-ups.service';
import { PaymentsService } from '../payments/payments.service';
import { ProductsService } from '../products/products.service';
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
    private vehiclesService: VehiclesService
  ) {}

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

  async deleteAccount(accountId: Types.ObjectId) {
    // First verify the account exists
    const account = await this.accountsService.findOne(accountId);
    if (!account) {
      throw new NotFoundException('admin.errors.accountNotFound');
    }

    // Perform cascade deletion in dependency-safe order
    // Delete payment orders first (they reference service orders)
    await this.paymentsService.deleteAllByAccount(accountId);

    // Delete service orders (they reference customers, services, technicians)
    await this.serviceOrdersService.deleteAllByAccount(accountId);

    // Delete expenses
    await this.expensesService.deleteAllByAccount(accountId);

    // Delete vehicle usages first (they reference vehicles and technicians)
    await this.vehicleUsagesService.deleteAllByAccount(accountId);

    // Delete vehicles
    await this.vehiclesService.deleteAllByAccount(accountId);

    // Delete quotes (they reference customers, services)
    await this.quotesService.deleteAllByAccount(accountId);

    // Delete contracts (they reference customers)
    await this.contractsService.deleteAllByAccount(accountId);

    // Delete follow-ups (they reference customers)
    await this.followUpsService.deleteAllByAccount(accountId);

    // Delete events (they reference customers, technicians)
    await this.eventsService.deleteAllByAccount(accountId);

    // Delete customers (they reference technicians and addresses)
    await this.customersService.deleteAllByAccount(accountId);

    // Delete technicians
    await this.techniciansService.deleteAllByAccount(accountId);

    // Delete services
    await this.servicesService.deleteAllByAccount(accountId);

    // Delete products
    await this.productsService.deleteAllByAccount(accountId);

    // Delete users
    await this.usersService.deleteAllByAccount(accountId);

    // Finally delete the account itself
    const deletedAccount = (await this.accountsService.delete(accountId)) as AccountDocument;

    if (!deletedAccount) {
      throw new BadRequestException('admin.errors.failedToDeleteAccount');
    }

    return {
      id: deletedAccount._id.toString(),
      name: deletedAccount.name,
      message: 'admin.success.accountDeleted'
    };
  }
}
