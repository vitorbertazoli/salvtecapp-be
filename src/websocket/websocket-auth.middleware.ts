import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { TechniciansService } from '../technicians/technicians.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class WebSocketAuthMiddleware {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private techniciansService: TechniciansService
  ) {}

  async use(socket: Socket, next: (err?: Error) => void) {
    try {
      // Extract token from handshake auth or query parameters
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      console.log('WebSocket auth attempt:', {
        hasAuthToken: !!socket.handshake.auth?.token,
        hasQueryToken: !!socket.handshake.query?.token,
        token: token ? 'present' : 'missing'
      });

      if (!token) {
        console.log('WebSocket auth failed: No token provided');
        throw new UnauthorizedException('No token provided');
      }

      // Verify the JWT token using the same secret as JwtStrategy
      let payload;
      try {
        console.log('Attempting to verify token with length:', token.length);
        console.log('Token starts with:', token.substring(0, 20));
        // Use the same secret as JwtStrategy
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        console.log('Using JWT secret from env:', !!process.env.JWT_SECRET);
        payload = await this.jwtService.verifyAsync(token, { secret });
        console.log('JWT verification successful, payload:', payload);
      } catch (error) {
        console.log('JWT verification error:', error);
        console.log('Error name:', error.name);
        console.log('Error message:', error.message);
        console.log('Token received (full):', token);
        throw new UnauthorizedException('Invalid token');
      }

      // Validate user exists and is active
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Populate roles for the user
      await user.populate('roles');

      // Check if account is active
      if (user.account?.status === 'pending') {
        throw new UnauthorizedException('Account not verified');
      }

      if (user.account?.status === 'suspended') {
        throw new UnauthorizedException('Account suspended');
      }

      if (user.account?.status !== 'active') {
        throw new UnauthorizedException('Account not active');
      }

      // Add user info to socket for later use
      socket.data.user = user;

      // If user is a technician, add technician info
      const isTechnician = user.roles?.some((role: any) => (typeof role === 'string' ? role : role.name) === 'TECHNICIAN');

      if (isTechnician) {
        const technician = await this.techniciansService.findByUserId(user._id.toString());
        if (technician) {
          socket.data.technician = technician;
        }
      }

      console.log('WebSocket auth successful for user:', user.email);
      next();
    } catch (error) {
      console.error('WebSocket authentication failed:', error.message);
      next(new UnauthorizedException('Authentication failed'));
    }
  }
}
