import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsModule } from '../accounts/accounts.module';
import { Account, AccountSchema } from '../accounts/schemas/account.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { UsersModule } from '../users/users.module';
import { Technician, TechnicianSchema } from './schemas/technician.schema';
import { TechniciansController } from './technicians.controller';
import { TechniciansService } from './technicians.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Technician.name, schema: TechnicianSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Account.name, schema: AccountSchema }
    ]),
    AccountsModule,
    UsersModule
  ],
  controllers: [TechniciansController],
  providers: [TechniciansService],
  exports: [TechniciansService]
})
export class TechniciansModule {}
