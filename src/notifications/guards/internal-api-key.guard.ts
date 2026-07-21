import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const configuredApiKey = process.env.INTERNAL_API_KEY;
    if (!configuredApiKey) {
      throw new UnauthorizedException('notifications.errors.internalApiKeyNotConfigured');
    }

    const providedApiKey = request.header('x-internal-api-key') || request.header('x-api-key');

    if (!providedApiKey) {
      throw new UnauthorizedException('notifications.errors.missingInternalApiKey');
    }

    const configuredBuffer = Buffer.from(configuredApiKey);
    const providedBuffer = Buffer.from(providedApiKey);

    if (configuredBuffer.length !== providedBuffer.length) {
      throw new UnauthorizedException('notifications.errors.invalidInternalApiKey');
    }

    const isMatch = timingSafeEqual(configuredBuffer, providedBuffer);
    if (!isMatch) {
      throw new UnauthorizedException('notifications.errors.invalidInternalApiKey');
    }

    return true;
  }
}
