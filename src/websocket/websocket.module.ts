import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TechniciansModule } from '../technicians/technicians.module';
import { UsersModule } from '../users/users.module';
import { AppGateway } from './app.gateway';
import { WebSocketAuthMiddleware } from './websocket-auth.middleware';

@Module({
  imports: [UsersModule, TechniciansModule, AuthModule],
  providers: [AppGateway, WebSocketAuthMiddleware],
  exports: [AppGateway]
})
export class WebsocketModule {}
