import { Injectable, ExecutionContext, Logger, Inject } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Role } from '@shared/types/role.enum';
import { extractBearerToken, verifyToken } from './utils/token.util';

/**
 * Custom ThrottlerGuard that bypasses rate limiting for SYSTEM_ADMIN users
 * while still logging their requests for audit purposes
 */
@Injectable()
export class SystemAdminThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(SystemAdminThrottlerGuard.name);
  private readonly jwtSecret: string;

  constructor(
    @Inject('THROTTLER_OPTIONS')
    protected readonly options: ThrottlerModuleOptions,
    @Inject('THROTTLER_STORAGE')
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
    this.jwtSecret = process.env.JWT_SECRET || '';
    if (!this.jwtSecret && process.env.NODE_ENV === 'production') {
      this.logger.warn(
        'JWT_SECRET not set - SystemAdminThrottlerGuard may not work properly',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const route = `${request.method} ${request.route?.path || request.url}`;

    // Try to extract user from request (set by auth middleware/guard)
    let user = request.user;

    // If not in request, try to extract from JWT token
    if (!user && this.jwtSecret) {
      const token = extractBearerToken(request.headers.authorization);
      if (token) {
        const decoded = verifyToken(token, this.jwtSecret);
        if (decoded) {
          user = {
            userId: decoded.sub,
            email: decoded.email,
            roles: decoded.roles,
            organizationId: decoded.organizationId,
          };
        }
      }
    }

    // Check if user has SYSTEM_ADMIN role
    if (
      user?.roles &&
      Array.isArray(user.roles) &&
      user.roles.includes(Role.SUPER_ADMIN)
    ) {
      // Log the bypass for audit purposes
      this.logger.log({
        message: 'SYSTEM_ADMIN throttle bypass',
        userId: user.userId,
        email: user.email,
        route,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });

      // Bypass rate limiting for SYSTEM_ADMIN
      return true;
    }

    // For non-SYSTEM_ADMIN users, apply normal throttling
    return super.canActivate(context);
  }
}
