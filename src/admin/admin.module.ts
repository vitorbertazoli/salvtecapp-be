import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { ContractQuotesModule } from '../contract-quotes/contract-quotes.module';
import { ContractsModule } from '../contracts/contracts.module';
import { CustomersModule } from '../customers/customers.module';
import { EventsModule } from '../events/events.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { FollowUpsModule } from '../follow-ups/follow-ups.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProductsModule } from '../products/products.module';
import { ProspectingModule } from '../prospecting/prospecting.module';
import { QuotesModule } from '../quotes/quotes.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { ServicesModule } from '../services/services.module';
import { TechniciansModule } from '../technicians/technicians.module';
import { TimekeepingModule } from '../timekeeping/timekeeping.module';
import { UsersModule } from '../users/users.module';
import { VehicleUsagesModule } from '../vehicle-usages/vehicle-usages.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MasterAdminGuard } from './guards/master-admin.guard';

@Module({
  imports: [
    AccountsModule,
    ContractQuotesModule,
    ContractsModule,
    CustomersModule,
    ExpensesModule,
    UsersModule,
    ProductsModule,
    PaymentsModule,
    ProspectingModule,
    QuotesModule,
    ServiceOrdersModule,
    ServicesModule,
    TimekeepingModule,
    TechniciansModule,
    EventsModule,
    FollowUpsModule,
    VehicleUsagesModule,
    VehiclesModule
  ],
  controllers: [AdminController],
  providers: [AdminService, MasterAdminGuard],
  exports: [AdminService, MasterAdminGuard]
})
export class AdminModule {}
