import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from './authorization.service';
import {
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
  REQUIRED_ROLES_KEY,
  PERMISSION_SCOPE_KEY,
  PERMISSION_MODE_KEY,
  PermissionScope,
  PermissionMode,
} from './decorators';
import {
  AUTH_INSUFFICIENT_PERMISSIONS,
  AUTH_UNAUTHORIZED,
  AUTH_FORBIDDEN_CROSS_TENANT,
} from '../errors/error-codes';
import { getOrCreateCorrelationId } from '../errors/correlation-id.util';

/**
 * User context from JWT token
 */
export interface UserContext {
  userId: string;
  organizationId?: string;
  roles?: string[];
  [key: string]: any;
}

/**
 * Authorization metrics for monitoring
 */
class AuthzMetrics {
  private static allowCount = 0;
  private static denyCount = 0;
  private static missingPermissionsCount = 0;

  static incrementAllow() {
    this.allowCount++;
  }

  static incrementDeny() {
    this.denyCount++;
  }

  static incrementMissingPermissions() {
    this.missingPermissionsCount++;
  }

  static getMetrics() {
    return {
      'authz.allow': this.allowCount,
      'authz.deny': this.denyCount,
      'authz.missing_permissions': this.missingPermissionsCount,
    };
  }
}

/**
 * Permissions Guard
 * Enforces permission-based access control with scope awareness
 * Integrates with JWT authentication and supports both global and tenant scopes
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private authorizationService: AuthorizationService,
  ) {}

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
        this.logger.debug(`Public route accessed: ${route}`);
        AuthzMetrics.incrementAllow();
        return true;
      }

      // Get user from request (set by authentication middleware/guard)
      const user: UserContext = request.user;

      if (!user || !user.userId) {
        this.logDenyDecision({
          correlationId,
          userId: 'unknown',
          route,
          reason: 'User not authenticated',
          requiredPermissions: [],
          scope: 'organization',
        });
        AuthzMetrics.incrementDeny();
        throw new UnauthorizedException({
          errorCode: AUTH_UNAUTHORIZED,
          message: 'User not authenticated',
          correlationId,
        });
      }

      // Check for role-based requirements
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        REQUIRED_ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = await this.authorizationService.hasAnyRole(
          user.userId,
          requiredRoles,
        );

        if (!hasRole) {
          this.logDenyDecision({
            correlationId,
            userId: user.userId,
            route,
            reason: 'User does not have required role',
            requiredRoles,
            scope: 'organization',
          });
          AuthzMetrics.incrementDeny();
          AuthzMetrics.incrementMissingPermissions();
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
        AuthzMetrics.incrementAllow();
        return true;
      }

      // Check for permission-based requirements
      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
        REQUIRED_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

      // If no permissions required, allow access (protected by auth but not by specific permissions)
      if (!requiredPermissions || requiredPermissions.length === 0) {
        AuthzMetrics.incrementAllow();
        return true;
      }

      // Get scope and mode
      const scope =
        this.reflector.getAllAndOverride<PermissionScope>(
          PERMISSION_SCOPE_KEY,
          [context.getHandler(), context.getClass()],
        ) || 'organization';

      const mode =
        this.reflector.getAllAndOverride<PermissionMode>(PERMISSION_MODE_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) || 'all';

      // Get organizationId from multiple sources (priority order):
      // 1. JWT claim (most trusted)
      // 2. Route param
      // 3. Request header
      const organizationId =
        user.organizationId ||
        request.params?.organizationId ||
        request.headers['x-organization-id'];

      // For tenant scope, validate tenant context
      if (scope === 'organization') {
        if (!organizationId) {
          this.logDenyDecision({
            correlationId,
            userId: user.userId,
            route,
            reason:
              'Organization ID missing for organization-scoped permission check',
            requiredPermissions,
            scope,
          });
          AuthzMetrics.incrementDeny();
          throw new ForbiddenException({
            errorCode: AUTH_FORBIDDEN_CROSS_TENANT,
            message: 'Organization context required for this operation',
            correlationId,
          });
        }

        // Validate organization consistency if organizationId is in URL/header
        if (
          user.organizationId &&
          (request.params?.organizationId ||
            request.headers['x-organization-id'])
        ) {
          const requestedOrganizationId =
            request.params?.organizationId ||
            request.headers['x-organization-id'];
          if (user.organizationId !== requestedOrganizationId) {
            // Allow if user is system admin (cross-tenant access)
            const isSystemAdmin = await this.authorizationService.isSystemAdmin(
              user.userId,
            );
            if (!isSystemAdmin) {
              this.logDenyDecision({
                correlationId,
                userId: user.userId,
                route,
                reason: 'Cross-organization access denied',
                requiredPermissions,
                scope,
                userOrganizationId: user.organizationId,
                requestedOrganizationId,
              });
              AuthzMetrics.incrementDeny();
              throw new ForbiddenException({
                errorCode: AUTH_FORBIDDEN_CROSS_TENANT,
                message:
                  'Access denied. You cannot access resources from another tenant.',
                correlationId,
              });
            }
          }
        }
      }

      // Check permissions based on mode
      let hasPermission: boolean;

      if (mode === 'any') {
        hasPermission = await this.authorizationService.hasAnyPermission(
          user.userId,
          requiredPermissions,
          { scope, organizationId },
        );
      } else {
        hasPermission = await this.authorizationService.hasAllPermissions(
          user.userId,
          requiredPermissions,
          { scope, organizationId },
        );
      }

      if (!hasPermission) {
        this.logDenyDecision({
          correlationId,
          userId: user.userId,
          route,
          reason: 'User lacks required permissions',
          requiredPermissions,
          scope,
          mode,
          organizationId,
        });
        AuthzMetrics.incrementDeny();
        AuthzMetrics.incrementMissingPermissions();
        throw new ForbiddenException({
          errorCode: AUTH_INSUFFICIENT_PERMISSIONS,
          message: `Insufficient permissions. Required: ${requiredPermissions.join(', ')} (${mode})`,
          correlationId,
          details: {
            requiredPermissions,
            mode,
            scope,
          },
        });
      }

      this.logger.debug(
        `Permission check passed for user ${user.userId} on route ${route} (scope: ${scope}, mode: ${mode})`,
      );
      AuthzMetrics.incrementAllow();
      return true;
    } catch (error) {
      // Re-throw if it's already a known exception
      if (
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `Unexpected error in PermissionsGuard for route ${route}: ${error.message}`,
        error.stack,
      );
      AuthzMetrics.incrementDeny();

      // Fail closed - deny access on unexpected errors
      throw new ForbiddenException({
        errorCode: AUTH_INSUFFICIENT_PERMISSIONS,
        message: 'Authorization check failed',
        correlationId,
      });
    }
  }

  /**
   * Log authorization deny decisions with structured format
   */
  private logDenyDecision(details: {
    correlationId: string;
    userId: string;
    route: string;
    reason: string;
    requiredPermissions?: string[];
    requiredRoles?: string[];
    scope?: PermissionScope;
    mode?: PermissionMode;
    organizationId?: string;
    userOrganizationId?: string;
    requestedOrganizationId?: string;
  }) {
    this.logger.warn({
      message: 'Authorization denied',
      ...details,
    });
  }

  /**
   * Get current metrics (for monitoring/debugging)
   */
  static getMetrics() {
    return AuthzMetrics.getMetrics();
  }
}
