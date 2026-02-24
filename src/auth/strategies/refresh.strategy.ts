import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          return req?.cookies?.refresh_token;
        }
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret'
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('auth.errors.userNotFound');
    }

    // Check if account is active
    if (user.account?.status === 'pending') {
      throw new UnauthorizedException('auth.errors.accountNotVerified');
    }

    if (user.account?.status === 'suspended') {
      throw new UnauthorizedException('auth.errors.accountSuspended');
    }

    if (user.account?.status !== 'active') {
      throw new UnauthorizedException('auth.errors.accountNotActive');
    }

    // Check if account is expired
    if (user.account?.expireDate) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const expireDate = new Date(user.account.expireDate);
      expireDate.setUTCHours(0, 0, 0, 0);

      if (today > expireDate) {
        throw new UnauthorizedException('auth.errors.accountExpired');
      }
    }

    return { id: user.id, email: user.email };
  }
}
