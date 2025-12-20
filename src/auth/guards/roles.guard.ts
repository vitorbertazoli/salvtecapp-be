import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';

export interface UserWithRoles {
  id: string;
  roles: Types.ObjectId[] | string[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user: UserWithRoles = request.user;

    if (!user || !user.roles) {
      return false;
    }

    // Check if user has any of the required roles
    return requiredRoles.some((role) => {
      // If roles are ObjectIds, convert to string for comparison
      const userRoles = user.roles.map((r) => (typeof r === 'string' ? r : r.toString()));
      return userRoles.includes(role);
    });
  }
}
