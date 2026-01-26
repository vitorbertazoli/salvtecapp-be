import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketAuthMiddleware } from './websocket-auth.middleware';

interface ConnectedUser {
  socketId: string;
  userId: string;
  accountId: string;
  accountName: string;
  email: string;
  roles: string[];
  technicianId?: string;
  connectedAt: Date;
}

@WebSocketGateway({
  namespace: '/socket'
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('AppGateway');
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  constructor(private webSocketAuthMiddleware: WebSocketAuthMiddleware) {}

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    // Apply authentication middleware to all connections
    _server.use(this.webSocketAuthMiddleware.use.bind(this.webSocketAuthMiddleware));
  }

  handleConnection(client: Socket, ..._args: any[]) {
    const user = client.data.user;
    if (user) {
      const connectedUser: ConnectedUser = {
        socketId: client.id,
        userId: user._id.toString(),
        accountId: user.account?._id.toString() || '',
        accountName: user.account?.name || '',
        email: user.email,
        roles: user.roles?.map((role: any) => (typeof role === 'string' ? role : role.name)) || [],
        technicianId: user.technicianId,
        connectedAt: new Date()
      };

      this.connectedUsers.set(client.id, connectedUser);
      this.logger.log(
        `Authenticated client connected: ${client.id} (User: ${user.email}, Account: ${connectedUser.accountName}, Roles: ${connectedUser.roles.join(', ')})`
      );
    } else {
      this.logger.warn(`Unauthenticated client connected: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    const connectedUser = this.connectedUsers.get(client.id);
    if (connectedUser) {
      this.connectedUsers.delete(client.id);
      this.logger.log(`Client disconnected: ${client.id} (User: ${connectedUser.email}, Account: ${connectedUser.accountName})`);
    } else {
      this.logger.log(`Client disconnected: ${client.id} (Unknown user)`);
    }
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket): string {
    this.logger.log(`Message received from ${client.id}: ${JSON.stringify(data)}`);
    return `Hello ${client.id}!`;
  }

  // Utility methods for managing connected users
  getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  getConnectedUsersByAccount(accountId: string): ConnectedUser[] {
    return Array.from(this.connectedUsers.values()).filter((user) => user.accountId === accountId);
  }

  getConnectedUsersByRole(role: string): ConnectedUser[] {
    return Array.from(this.connectedUsers.values()).filter((user) => user.roles.includes(role));
  }

  getConnectedUser(socketId: string): ConnectedUser | undefined {
    return this.connectedUsers.get(socketId);
  }

  getConnectionCount(): number {
    return this.connectedUsers.size;
  }

  // Broadcast methods
  broadcastToAccount(accountId: string, event: string, data: any): void {
    const accountUsers = this.getConnectedUsersByAccount(accountId);
    accountUsers.forEach((user) => {
      this.server.to(user.socketId).emit(event, data);
    });
    this.logger.log(`Broadcasted ${event} to ${accountUsers.length} users in account ${accountId}`);
  }

  broadcastToRole(accountId: string, role: string, event: string, data: any): void {
    const roleUsers = this.getConnectedUsersByAccount(accountId).filter((user) => user.roles.includes(role));
    roleUsers.forEach((user) => {
      this.server.to(user.socketId).emit(event, data);
    });
    this.logger.log(`Broadcasted ${event} to ${roleUsers.length} users with role ${role} in account ${accountId}`);
  }

  broadcastToRoles(accountId: string, roles: string[], event: string, data: any): void {
    const rolesUsers = this.getConnectedUsersByAccount(accountId).filter((user) => roles.some((role) => user.roles.includes(role)));
    rolesUsers.forEach((user) => {
      this.server.to(user.socketId).emit(event, data);
    });
    this.logger.log(`Broadcasted ${event} to ${rolesUsers.length} users with roles [${roles.join(', ')}] in account ${accountId}`);
  }
}
