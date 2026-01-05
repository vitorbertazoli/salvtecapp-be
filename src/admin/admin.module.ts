import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { CustomersModule } from '../customers/customers.module';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { QuotesModule } from '../quotes/quotes.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { ServicesModule } from '../services/services.module';
import { TechniciansModule } from '../technicians/technicians.module';
import { EventsModule } from '../events/events.module';
import { FollowUpsModule } from '../follow-ups/follow-ups.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MasterAdminGuard } from './guards/master-admin.guard';

@Module({
  imports: [
    AccountsModule,
    CustomersModule,
    UsersModule,
    ProductsModule,
    QuotesModule,
    ServiceOrdersModule,
    ServicesModule,
    TechniciansModule,
    EventsModule,
    FollowUpsModule
  ],
  controllers: [AdminController],
  providers: [AdminService, MasterAdminGuard],
  exports: [AdminService, MasterAdminGuard]
})
export class AdminModule {}
