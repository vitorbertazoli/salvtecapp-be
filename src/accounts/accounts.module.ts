import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../utils/email.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { PublicAccountsController } from './public-accounts.controller';
import { Account, AccountSchema } from './schemas/account.schema';
import { Address, AddressSchema } from './schemas/address.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Address.name, schema: AddressSchema }
    ]),
    UsersModule,
    RolesModule,
    EmailModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10
      }
    ])
  ],
  controllers: [PublicAccountsController, AccountsController],
  providers: [AccountsService],
  exports: [AccountsService]
})
export class AccountsModule {}
