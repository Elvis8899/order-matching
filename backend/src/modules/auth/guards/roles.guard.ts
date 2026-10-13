import { ROLES_KEY } from "@auth/decorators/roles.decorator";
import { RequestJWTPayload } from "@auth/domain/login.entity";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRoleEnum } from "@user/domain/user.entity";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserRoleEnum[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: RequestJWTPayload }>();

    return requiredRoles.some((role) => user?.role === role);
  }
}
