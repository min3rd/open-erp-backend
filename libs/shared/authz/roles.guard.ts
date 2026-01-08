import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, REQUIRED_ROLES_KEY } from './decorators';
import { UserContext } from './permissions.guard';
import { Role } from '@shared/types/role.enum';
import { extractBearerToken, verifyToken } from './utils/token.util';
import { ITokenResolver } from './interfaces/resolver.interface';
import {
  AUTH_UNAUTHORIZED,
  AUTH_INSUFFICIENT_PERMISSIONS,
} from '../errors/error-codes';
import { getOrCreateCorrelationId } from '../errors/correlation-id.util';

/**
 * Roles Guard
 * Enforces role-based access control with SUPER_ADMIN bypass
 * Can work independently or with JwtAuthGuard
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  private readonly jwtSecret: string;

  constructor(
    private reflector: Reflector,
    @Optional() private tokenResolver?: ITokenResolver,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || '';
    if (!this.jwtSecret && process.env.NODE_ENV === 'production') {
      this.logger.warn('JWT_SECRET not set - RolesGuard may not work properly');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const correlationId = getOrCreateCorrelationId(request);
    const route = `${request.method} ${request.route?.path || request.url}`;

    try {
      // Check if route is public
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (isPublic) {
        return true;
      }

      // Get required roles
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        REQUIRED_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      // If no roles required, allow access
      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      // Ensure user context exists
      let user: UserContext = request.user;

      if (!user || !user.userId) {
        // Try to resolve user from token
        user = await this.resolveUserFromRequest(request);

        if (!user) {
          this.logger.warn(
            `RolesGuard: User not authenticated for route ${route}`,
          );
          throw new UnauthorizedException({
            errorCode: AUTH_UNAUTHORIZED,
            message: 'User not authenticated',
            correlationId,
          });
        }

        // Set user in request for downstream use
        request.user = user;
      }

      // Check for SUPER_ADMIN bypass
      if (user.roles && user.roles.includes(Role.SYSTEM_ADMIN)) {
        this.logger.debug(
          `SYSTEM_ADMIN bypass granted for user ${user.userId} on route ${route}`,
        );
        // Audit log for SUPER_ADMIN access
        this.auditSuperAdminAccess(user.userId, route, correlationId);
        return true;
      }

      // Check if user has any of the required roles
      const hasRole =
        user.roles && requiredRoles.some((role) => user.roles?.includes(role));

      if (!hasRole) {
        this.logger.warn(
          `Access denied for user ${user.userId} on route ${route}. Required roles: ${requiredRoles.join(', ')}. User roles: ${user.roles?.join(', ') || 'none'}`,
        );
        throw new ForbiddenException({
          errorCode: AUTH_INSUFFICIENT_PERMISSIONS,
          message: `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
          correlationId,
          details: {
            requiredRoles,
          },
        });
      }

      this.logger.debug(
        `Role check passed for user ${user.userId} on route ${route}`,
      );
      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      this.logger.error(
        `Unexpected error in RolesGuard for route ${route}: ${error.message}`,
        error.stack,
      );
      throw new ForbiddenException({
        errorCode: AUTH_INSUFFICIENT_PERMISSIONS,
        message: 'Role check failed',
        correlationId,
      });
    }
  }

  /**
   * Resolve user context from request Authorization header
   */
  private async resolveUserFromRequest(
    request: any,
  ): Promise<UserContext | null> {
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      return null;
    }

    // Try custom token resolver first
    if (this.tokenResolver) {
      try {
        return await this.tokenResolver.resolveToken(token);
      } catch (error) {
        this.logger.warn(`Custom token resolver failed: ${error.message}`);
      }
    }

    // Fallback to JWT verification
    if (this.jwtSecret) {
      const decoded = verifyToken(token, this.jwtSecret);
      if (decoded) {
        return {
          userId: decoded.sub,
          email: decoded.email,
          organizationId: decoded.organizationId,
          roles: decoded.roles,
        };
      }
    }

    return null;
  }

  /**
   * Audit SUPER_ADMIN access
   */
  private auditSuperAdminAccess(
    userId: string,
    route: string,
    correlationId: string,
  ): void {
    this.logger.log({
      message: 'SYSTEM_ADMIN bypass used',
      userId,
      route,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }
}
