import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '../utils/token.util';
import { IS_PUBLIC_KEY } from '@shared/authz/decorators';

/**
 * JWT Authentication Guard
 * Validates Bearer tokens and sets user context in request
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
    this.jwtSecret =
      process.env.JWT_SECRET || 'your-secret-key-change-in-production';
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
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      this.logger.warn('Missing Authorization header');
      throw new UnauthorizedException('Authorization header is required');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      this.logger.warn('Invalid Authorization header format');
      throw new UnauthorizedException('Bearer token is required');
    }

    // Verify token
    const decoded = verifyToken(token, this.jwtSecret);
    if (!decoded) {
      this.logger.warn('Invalid or expired token');
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Set user context in request
    request.user = {
      userId: decoded.sub,
      email: decoded.email,
    };

    return true;
  }
}
