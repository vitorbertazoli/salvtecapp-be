import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { EquipmentModule } from './equipment/equipment.module';
import { ProductsModule } from './products/products.module';
import { RolesModule } from './roles/roles.module';
import { ServicesModule } from './services/services.module';
import { TechniciansModule } from './technicians/technicians.module';
import { UsersModule } from './users/users.module';

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
    UsersModule,
    AccountsModule,
    RolesModule,
    ServicesModule,
    ProductsModule,
    TechniciansModule,
    CustomersModule,
    EquipmentModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
