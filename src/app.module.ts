import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from './accounts/accounts.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ContractsModule } from './contracts/contracts.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EquipmentTypeModule } from './equipmentType/equipment-type.module';
import { EventsModule } from './events/events.module';
import { FollowUpsModule } from './follow-ups/follow-ups.module';
import { ProductsModule } from './products/products.module';
import { QuotesModule } from './quotes/quotes.module';
import { RolesModule } from './roles/roles.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { ServicesModule } from './services/services.module';
import { TechniciansModule } from './technicians/technicians.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './utils/email.module';
import { VehicleUsagesModule } from './vehicle-usages/vehicle-usages.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI')
      }),
      inject: [ConfigService]
    }),
    AuthModule,
    AdminModule,
    UsersModule,
    AccountsModule,
    ContractsModule,
    RolesModule,
    ServicesModule,
    ProductsModule,
    TechniciansModule,
    CustomersModule,
    QuotesModule,
    EquipmentTypeModule,
    ServiceOrdersModule,
    EventsModule,
    FollowUpsModule,
    DashboardModule,
    EmailModule,
    VehiclesModule,
    VehicleUsagesModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
