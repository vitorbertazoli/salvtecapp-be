import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';

describe('JwtStrategy', () => {
  it('rejects access tokens for inactive users', async () => {
    const usersService = {
      findById: jest.fn().mockResolvedValue({ status: 'inactive' })
    };
    const techniciansService = {
      findByUserId: jest.fn()
    };
    const strategy = new JwtStrategy(usersService as any, techniciansService as any);

    await expect(strategy.validate({ sub: 'inactive-user-id' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(techniciansService.findByUserId).not.toHaveBeenCalled();
  });
});