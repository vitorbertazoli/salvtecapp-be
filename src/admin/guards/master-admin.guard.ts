import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class MasterAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('admin.errors.userNotAuthenticated');
    }

    if (!user.isMasterAdmin) {
      throw new ForbiddenException('admin.errors.masterAdminAccessRequired');
    }

    return true;
  }
}
