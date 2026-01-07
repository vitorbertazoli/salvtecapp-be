import { Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { CustomersService } from '../customers/customers.service';
import { UsersService } from '../users/users.service';
import { ProductsService } from '../products/products.service';
import { QuotesService } from '../quotes/quotes.service';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { ServicesService } from '../services/services.service';
import { TechniciansService } from '../technicians/technicians.service';
import { EventsService } from '../events/events.service';
import { FollowUpsService } from '../follow-ups/follow-ups.service';
import { AccountDocument } from '../accounts/schemas/account.schema';
import { Types } from 'mongoose';

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
    private followUpsService: FollowUpsService
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
      throw new Error('Account not found');
    }

    return {
      id: updatedAccount._id.toString(),
      name: updatedAccount.name,
      plan: updatedAccount.plan,
      status: updatedAccount.status,
      logoUrl: updatedAccount.logoUrl
    };
  }

  async deleteAccount(accountId: Types.ObjectId) {
    // First verify the account exists
    const account = await this.accountsService.findOne(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Perform cascade deletion in the correct order to handle dependencies
    // Delete service orders first (they reference customers, services, technicians)
    await this.serviceOrdersService.deleteAllByAccount(accountId);

    // Delete quotes (they reference customers, services)
    await this.quotesService.deleteAllByAccount(accountId);

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
      throw new Error('Failed to delete account');
    }

    return {
      id: deletedAccount._id.toString(),
      name: deletedAccount.name,
      message: 'Account and all related data deleted successfully'
    };
  }
}
