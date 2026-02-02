import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { fetched } from '@shared/response';

/**
 * Authenticated request interface with user context
 */
interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
  };
}

@ApiTags('user')
@Controller()
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          nullable: true,
          example: 'User profile retrieved successfully',
        },
        error: { type: 'null' },
        data: {
          type: 'object',
          properties: {
            mode: { type: 'string', example: 'get' },
            item: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                email: { type: 'string', example: 'user@example.com' },
                username: { type: 'string', example: 'johndoe' },
                fullName: { type: 'string', example: 'John Doe' },
                avatarUrl: { type: 'string', nullable: true, example: 'https://example.com/avatar.jpg' },
                status: { type: 'string', example: 'active' },
                verifiedAt: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' },
                roles: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '507f1f77bcf86cd799439012' },
                      code: { type: 'string', example: 'SYSTEM_ADMIN' },
                      name: { type: 'string', example: 'System Administrator' },
                      description: { type: 'string', example: 'Full system access' },
                    },
                    required: ['id', 'code', 'name'],
                  },
                  description: 'Global roles assigned to the user',
                },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['users.create', 'users.read', 'users.update', 'users.delete'],
                  description: 'Global permissions derived from roles',
                },
              },
            },
          },
        },
        meta: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User account is not active',
  })
  async getMe(@Request() req: AuthenticatedRequest) {
    // JwtAuthGuard ensures user is set, so we can safely access userId
    const result = await this.authService.getMe(req.user.userId);
    return fetched(result, 'User profile retrieved successfully');
  }
}
