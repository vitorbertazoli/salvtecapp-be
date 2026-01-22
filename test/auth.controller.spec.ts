import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { LoginDto } from '../src/auth/dto/login.dto';
import { ResetPasswordDto } from '../src/auth/dto/reset-password.dto';
import { LocalAuthGuard } from '../src/auth/guards/local-auth.guard';
import { RefreshAuthGuard } from '../src/auth/guards/refresh-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockLoginResult = {
    access_token: 'access_token_123',
    refresh_token: 'refresh_token_123',
    user: {
      id: 'user_id_123',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe'
    }
  };

  const mockRefreshResult = {
    access_token: 'new_access_token_123',
    refresh_token: 'new_refresh_token_123',
    user: {
      id: 'user_id_123',
      email: 'john.doe@example.com'
    }
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      refreshToken: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService
        }
      ]
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RefreshAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login successfully and set refresh token cookie', async () => {
      const loginDto: LoginDto = {
        email: 'john.doe@example.com',
        password: 'password123'
      };

      authService.login.mockResolvedValue(mockLoginResult);

      const mockResponse = {
        cookie: jest.fn()
      } as unknown as Response;

      const result = await controller.login(loginDto, mockResponse);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', 'refresh_token_123', {
        httpOnly: true,
        secure: false, // NODE_ENV is not 'production' in test
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      expect(result).toEqual({
        access_token: 'access_token_123',
        user: mockLoginResult.user
      });
    });

    it('should set secure cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const loginDto: LoginDto = {
        email: 'john.doe@example.com',
        password: 'password123'
      };

      authService.login.mockResolvedValue(mockLoginResult);

      const mockResponse = {
        cookie: jest.fn()
      } as unknown as Response;

      await controller.login(loginDto, mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh_token_123',
        expect.objectContaining({
          secure: true
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should return null when login fails', async () => {
      const loginDto: LoginDto = {
        email: 'john.doe@example.com',
        password: 'wrongpassword'
      };

      authService.login.mockResolvedValue(null);

      const mockResponse = {
        cookie: jest.fn()
      } as unknown as Response;

      const result = await controller.login(loginDto, mockResponse);

      expect(result).toBeNull();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully and set new refresh token cookie', async () => {
      const mockRequest = {
        user: { id: 'user_id_123' }
      };

      authService.refreshToken.mockResolvedValue(mockRefreshResult);

      const mockResponse = {
        cookie: jest.fn()
      } as unknown as Response;

      const result = await controller.refresh(mockRequest, mockResponse);

      expect(authService.refreshToken).toHaveBeenCalledWith(mockRequest.user);
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', 'new_refresh_token_123', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      expect(result).toEqual({
        access_token: 'new_access_token_123',
        user: mockRefreshResult.user
      });
    });

    it('should return null when refresh fails', async () => {
      const mockRequest = {
        user: { id: 'user_id_123' }
      };

      authService.refreshToken.mockResolvedValue(null);

      const mockResponse = {
        cookie: jest.fn()
      } as unknown as Response;

      const result = await controller.refresh(mockRequest, mockResponse);

      expect(result).toBeNull();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should send forgot password email successfully', async () => {
      const email = 'john.doe@example.com';
      const expectedResult = {
        message: 'If an account with that email exists, a password reset link has been sent.'
      };

      authService.forgotPassword.mockResolvedValue(expectedResult);

      const result = await controller.forgotPassword(email);

      expect(authService.forgotPassword).toHaveBeenCalledWith(email);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'reset_token_123',
        newPassword: 'newpassword123'
      };

      const expectedResult = { message: 'Password has been reset successfully' };

      authService.resetPassword.mockResolvedValue(expectedResult);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith('reset_token_123', 'newpassword123');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('logout', () => {
    it('should clear refresh token cookie and return success message', async () => {
      const mockResponse = {
        clearCookie: jest.fn()
      } as unknown as Response;

      const result = await controller.logout(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/api/auth' });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
