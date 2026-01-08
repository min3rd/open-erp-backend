import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators';
import {
  verifyToken,
  generateRandomSecret,
  extractBearerToken,
  JwtPayload,
} from './utils/token.util';

/**
 * JWT Authentication Guard
 * Validates Bearer tokens and sets user context in request
 *
 * This guard should be used before PermissionsGuard to ensure
 * authentication happens before authorization.
 *
 * @example
 * ```typescript
 * @Controller('organizations')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * export class OrganizationController {
 *   @Post(':organizationId/users')
 *   @Permissions(Permission.ORGANIZATION_INVITE)
 *   async inviteMember(@CurrentUser() user: UserContext) {
 *     // user is guaranteed to be authenticated
 *   }
 * }
 * ```
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly jwtSecret: string;

  constructor(private reflector: Reflector) {
    // JWT configuration - fail fast if not set in production
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET environment variable must be set in production',
      );
    }
    this.jwtSecret = process.env.JWT_SECRET || this.generateFallbackSecret();
  }

  /**
   * Generate a random secret for non-production use
   */
  private generateFallbackSecret(): string {
    const secret = generateRandomSecret();
    this.logger.warn(
      'Using auto-generated JWT secret. Set JWT_SECRET in production!',
    );
    return secret;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Extract token from Authorization header
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      this.logger.warn('Missing or invalid Authorization header');
      throw new UnauthorizedException('Bearer token is required');
    }

    // Verify token
    const decoded = verifyToken(token, this.jwtSecret);
    if (!decoded) {
      this.logger.warn('Invalid or expired token');
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Set user context in request
    // This user object will be used by PermissionsGuard and CurrentUser decorator
    request.user = {
      userId: decoded.sub,
      email: decoded.email,
      organizationId: decoded.organizationId, // Optional: may be in JWT
      roles: decoded.roles, // Optional: may be in JWT
    };

    return true;
  }
}
