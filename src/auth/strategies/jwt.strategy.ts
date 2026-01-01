import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { TechniciansService } from 'src/technicians/technicians.service';

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
      throw new UnauthorizedException('User not found');
    }

    // // Check if account is active
    // if (user.account?.status === 'pending') {
    //   throw new UnauthorizedException('Account not verified. Please check your email for verification instructions.');
    // }

    // if (user.account?.status === 'suspended') {
    //   throw new UnauthorizedException('Account is suspended. Please contact support.');
    // }

    // if (user.account?.status !== 'active') {
    //   throw new UnauthorizedException('Account is not active. Please contact support.');
    // }

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
      account: payload.account,  // Use account ID from JWT payload
      accountName: payload.accountName,
      logoUrl: payload.logoUrl,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles: user.roles.map((role) => (typeof role === 'string' ? role : (role as any).name)),
      technicianId: technicianId
    };
  }
}
