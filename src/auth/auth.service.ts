import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AccountsService } from '../accounts/accounts.service';
import { TechniciansService } from '../technicians/technicians.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../utils/email.service';

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

    // Validate account status
    this.validateAccountStatus(user.account);
    // Validate user status
    this.validateUserStatus(user);

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

    // Validate account and user status
    this.validateAccountStatus(userData.account);
    this.validateUserStatus(userData);

    const payload = await this.createJwtPayload(userData);
    const tokens = this.generateTokens(payload);

    return {
      ...tokens,
      user: payload
    };
  }

  async refreshToken(userFromGuard: any) {
    const user = await this.usersService.findById(userFromGuard.id);
    if (!user) {
      throw new NotFoundException('auth.errors.userNotFound');
    }

    // Validate account and user status
    this.validateAccountStatus(user.account);
    this.validateUserStatus(user);

    const accessPayload = await this.createJwtPayload(user);
    const tokens = this.generateTokens(accessPayload);

    return {
      ...tokens,
      user: accessPayload
    };
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
      throw new BadRequestException('auth.errors.invalidResetToken');
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
      user.account
    );

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Validates account status and throws appropriate errors
   */
  private validateAccountStatus(account: any): void {
    if (account?.status === 'pending') {
      throw new BadRequestException('auth.errors.accountNotVerified');
    }

    if (account?.status === 'suspended') {
      throw new BadRequestException('auth.errors.accountSuspended');
    }

    if (account?.status !== 'active') {
      throw new BadRequestException('auth.errors.accountNotActive');
    }

    // Check if account is expired
    if (account?.expireDate) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const expireDate = new Date(account.expireDate);
      expireDate.setUTCHours(0, 0, 0, 0);

      if (today > expireDate) {
        throw new BadRequestException('auth.errors.accountExpired');
      }
    }
  }

  /**
   * Validates user status and throws appropriate errors
   */
  private validateUserStatus(user: any): void {
    if (user.status !== 'active') {
      throw new BadRequestException('auth.errors.userNotActive');
    }
  }

  /**
   * Creates JWT payload from user data
   */
  private async createJwtPayload(user: any): Promise<any> {
    // Check if user is a technician and get technician ID
    const technicianId = await this.getTechnicianId(user);

    return {
      sub: user.id,
      id: user.id,
      account: user.account?.id, // Just the account ID
      accountName: user.account?.name,
      logoUrl: user.account?.logoUrl,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      roles: user.roles.map((role: any) => role.name) || [],
      technicianId: technicianId,
      ...(user.isMasterAdmin && { isMasterAdmin: user.isMasterAdmin })
    };
  }

  /**
   * Generates access and refresh tokens
   */
  private generateTokens(payload: any): { access_token: string; refresh_token: string } {
    const refreshPayload = {
      sub: payload.id
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m'
      }),
      refresh_token: this.jwtService.sign(refreshPayload, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        expiresIn: '7d'
      })
    };
  }

  /**
   * Gets technician ID if user is a technician
   */
  private async getTechnicianId(user: any): Promise<string | undefined> {
    if (user.roles.some((role: any) => (typeof role === 'string' ? role : role.name) === 'TECHNICIAN')) {
      const technician = await this.techniciansService.findByUserId(user.id);
      return technician?.id;
    }
    return undefined;
  }
}
