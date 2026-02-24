import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TechniciansService } from 'src/technicians/technicians.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private techniciansService: TechniciansService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key'
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

    // if this user is a TECHNICIAN, ensure their technician id gets added to the user object
    let technicianId = undefined;
    if (user.roles.some((role) => (typeof role === 'string' ? role : (role as any).name) === 'TECHNICIAN')) {
      const technician = await this.techniciansService.findByUserId(user.id);
      if (technician) {
        technicianId = technician.id;
      }
    }
    return {
      id: user.id,
      account: payload.account, // Use account ID from JWT payload
      accountName: payload.accountName,
      logoUrl: payload.logoUrl,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles: user.roles.map((role) => (typeof role === 'string' ? role : (role as any).name)),
      technicianId: technicianId,
      ...(payload.isMasterAdmin && { isMasterAdmin: payload.isMasterAdmin })
    };
  }
}
