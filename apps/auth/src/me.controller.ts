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
