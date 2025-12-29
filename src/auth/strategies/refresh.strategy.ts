import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret'
    });
  }

  async validate(payload: any) {
    console.log('Refresh Strategy validate called with payload:', payload);
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      console.log('User not found for refresh token ID:', payload.sub);
      return null;
    }
    console.log('User found for refresh token:', user.email);
    return { id: user.id, email: user.email };
  }
}
