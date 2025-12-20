import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AccountsService } from 'src/accounts/accounts.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private accountService: AccountsService
  ) { }

  async validateUser(accountName: string, username: string, password: string): Promise<any> {
    // find the account first
    const account = await this.accountService.findByAccountName(accountName);
    if (!account) {
      return null;
    }

    const user = await this.usersService.findOneByUsernameAndAccount(username, account.id);

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash: _, ...result } = user.toObject();
      return result;
    }

    return null;
  }

  async login(user: any) {
    const account = await this.accountService.findByAccountName(user.accountName);
    if (!account) {
      return null;
    }
    const userData = await this.usersService.findOneByUsernameAndAccount(user.username, account.id);
    const payload = {
      sub: userData?.id,
      id: userData?.id,
      account: userData?.account,
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      email: userData?.email,
      username: userData?.username,
      roles: userData?.roles.map((role: any) => role.name) || []
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

      const accessPayload = {
        sub: user.id,
        id: user.id,
        account: user.account,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        roles: user.roles.map((role: any) => role.name) || []
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
}
