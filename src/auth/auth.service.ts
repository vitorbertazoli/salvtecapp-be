import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AccountsService } from 'src/accounts/accounts.service';
import { UsersService } from '../users/users.service';
import { TechniciansService } from '../technicians/technicians.service';
import { EmailService } from '../utils/email.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private accountService: AccountsService,
    private techniciansService: TechniciansService,
    private emailService: EmailService
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // Find user by email (globally unique)
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      return null;
    }

    // Check if account is active
    if (user.account?.status === 'pending') {
      throw new Error('Account not verified. Please check your email for verification instructions.');
    }

    if (user.account?.status === 'suspended') {
      throw new Error('Account is suspended. Please contact support.');
    }

    if (user.account?.status !== 'active') {
      throw new Error('Account is not active. Please contact support.');
    }

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash: _, ...result } = user.toObject();
      return result;
    }

    return null;
  }

  async login(user: any) {
    // Find user by email only (globally unique)
    const userData = await this.usersService.findOneByEmail(user.email);
    if (!userData) {
      return null;
    }

    // Check if user is a technician and get technician ID
    let technicianId = undefined;
    if (userData.roles.some((role) => (typeof role === 'string' ? role : (role as any).name) === 'TECHNICIAN')) {
      const technician = await this.techniciansService.findByUserId(userData.id);
      if (technician) {
        technicianId = technician.id;
      }
    }

    const payload = {
      sub: userData?.id,
      id: userData?.id,
      account: userData?.account?.id,  // Just the account ID
      accountName: userData?.account?.name,
      logoUrl: userData?.account?.logoUrl,
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      email: userData?.email,
      roles: userData?.roles.map((role: any) => role.name) || [],
      technicianId: technicianId,
      ...(userData?.isMasterAdmin && { isMasterAdmin: userData.isMasterAdmin })
    };

    const refreshPayload = {
      sub: userData?.id
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m'
      }),
      refresh_token: this.jwtService.sign(refreshPayload, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        expiresIn: '7d'
      }),
      user: payload
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is a technician and get technician ID
      let technicianId = undefined;
      if (user.roles.some((role) => (typeof role === 'string' ? role : (role as any).name) === 'TECHNICIAN')) {
        const technician = await this.techniciansService.findByUserId(user.id);
        if (technician) {
          technicianId = technician.id;
        }
      }

      const accessPayload = {
        sub: user.id,
        id: user.id,
        account: user.account?.id,  // Just the account ID
        accountName: user.account?.name,
        logoUrl: user.account?.logoUrl,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles.map((role: any) => role.name) || [],
        technicianId: technicianId
      };
      const refreshPayload = {
        sub: user?.id
      };

      return {
        access_token: this.jwtService.sign(accessPayload, {
          secret: process.env.JWT_SECRET,
          expiresIn: '15m'
        }),
        refresh_token: this.jwtService.sign(refreshPayload, {
          secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
          expiresIn: '7d'
        }),
        user: accessPayload
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    // Find user by email
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Update user with reset token
    await this.usersService.updateResetToken(email, resetToken, resetTokenExpiry);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken, `${user.firstName} ${user.lastName}`);

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Find user by reset token
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    await this.usersService.update(
      user.id,
      {
        passwordHash: hashedPassword,
        resetToken: undefined,
        resetTokenExpiry: undefined
      },
      user.account.toString()
    );

    return { message: 'Password has been reset successfully' };
  }
}
