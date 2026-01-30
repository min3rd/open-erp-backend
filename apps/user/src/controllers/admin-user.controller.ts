import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AdminUserService } from '../services/admin-user.service';
import {
  AdminResetPasswordDto,
  AdminRevokeSessionsDto,
  AdminBlockUserDto,
  AdminUnblockUserDto,
  AdminResetPasswordResponseDto,
  AdminRevokeSessionsResponseDto,
  AdminBlockUserResponseDto,
  AdminUnblockUserResponseDto,
} from '../dto/admin-user.dto';
import { JwtAuthGuard, PermissionsGuard } from '@shared/authz';
import { Permissions } from '@shared/authz/decorators';
import { Permission } from '@shared/types/permission.enum';
import { ok } from '@shared/response';

/**
 * Admin User Management Controller
 * Handles admin operations: reset password, revoke sessions, block/unblock accounts
 * All endpoints require admin permissions (MANAGE_USERS_AND_ORGS or MANAGE_ORG_USERS)
 */
@ApiTags('admin/users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Post(':identifier/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset user password (admin)',
    description:
      'Reset a user password. Can auto-generate a strong password or use admin-provided password. ' +
      'Identifier can be username or email. Optionally revokes all sessions and sends email notification.',
  })
  @ApiParam({
    name: 'identifier',
    description: 'User identifier (username or email)',
    example: 'john_doe or john@example.com',
  })
  @ApiBody({ type: AdminResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: AdminResetPasswordResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Password reset successfully',
        error: null,
        data: {
          success: true,
          userId: '507f1f77bcf86cd799439011',
          generatedPassword: 'Abc123XyzDef456!',
          emailSent: true,
          sessionsRevoked: true,
          tokenVersion: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @Permissions([Permission.MANAGE_USERS_AND_ORGS, Permission.MANAGE_ORG_USERS], {
    mode: 'any',
    scope: 'global',
  })
  async resetPassword(
    @Param('identifier') identifier: string,
    @Body() dto: AdminResetPasswordDto,
    @Request() req: any,
  ) {
    const adminUserId = req.user.userId;
    const result = await this.adminUserService.resetUserPassword(
      identifier,
      adminUserId,
      dto,
    );
    return ok(result, 'Password reset successfully');
  }

  @Post(':identifier/revoke-sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke all user sessions (admin)',
    description:
      'Revoke all active sessions and refresh tokens for a user. ' +
      'Identifier can be username or email. Increments tokenVersion to invalidate JWTs.',
  })
  @ApiParam({
    name: 'identifier',
    description: 'User identifier (username or email)',
    example: 'john_doe or john@example.com',
  })
  @ApiBody({ type: AdminRevokeSessionsDto })
  @ApiResponse({
    status: 200,
    description: 'Sessions revoked successfully',
    type: AdminRevokeSessionsResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Sessions revoked successfully',
        error: null,
        data: {
          success: true,
          userId: '507f1f77bcf86cd799439011',
          tokensRevoked: 3,
          tokenVersion: 2,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @Permissions([Permission.MANAGE_USERS_AND_ORGS, Permission.MANAGE_ORG_USERS], {
    mode: 'any',
    scope: 'global',
  })
  async revokeSessions(
    @Param('identifier') identifier: string,
    @Body() dto: AdminRevokeSessionsDto,
    @Request() req: any,
  ) {
    const adminUserId = req.user.userId;
    const result = await this.adminUserService.revokeUserSessions(
      identifier,
      adminUserId,
      dto,
    );
    return ok(result, 'Sessions revoked successfully');
  }

  @Post(':identifier/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Block user account (admin)',
    description:
      'Block a user account to prevent login. ' +
      'Identifier can be username or email. Optionally revokes sessions and sends email notification.',
  })
  @ApiParam({
    name: 'identifier',
    description: 'User identifier (username or email)',
    example: 'john_doe or john@example.com',
  })
  @ApiBody({ type: AdminBlockUserDto })
  @ApiResponse({
    status: 200,
    description: 'User blocked successfully',
    type: AdminBlockUserResponseDto,
    schema: {
      example: {
        success: true,
        message: 'User blocked successfully',
        error: null,
        data: {
          success: true,
          userId: '507f1f77bcf86cd799439011',
          blockedAt: '2024-01-15T10:30:00.000Z',
          reason: 'Violation of terms of service',
          emailSent: true,
          sessionsRevoked: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User already blocked',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @Permissions([Permission.MANAGE_USERS_AND_ORGS, Permission.MANAGE_ORG_USERS], {
    mode: 'any',
    scope: 'global',
  })
  async blockUser(
    @Param('identifier') identifier: string,
    @Body() dto: AdminBlockUserDto,
    @Request() req: any,
  ) {
    const adminUserId = req.user.userId;
    const result = await this.adminUserService.blockUser(
      identifier,
      adminUserId,
      dto,
    );
    return ok(result, 'User blocked successfully');
  }

  @Post(':identifier/unblock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unblock user account (admin)',
    description:
      'Unblock a previously blocked user account. ' +
      'Identifier can be username or email. Optionally sends email notification.',
  })
  @ApiParam({
    name: 'identifier',
    description: 'User identifier (username or email)',
    example: 'john_doe or john@example.com',
  })
  @ApiBody({ type: AdminUnblockUserDto })
  @ApiResponse({
    status: 200,
    description: 'User unblocked successfully',
    type: AdminUnblockUserResponseDto,
    schema: {
      example: {
        success: true,
        message: 'User unblocked successfully',
        error: null,
        data: {
          success: true,
          userId: '507f1f77bcf86cd799439011',
          emailSent: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is not blocked',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @Permissions([Permission.MANAGE_USERS_AND_ORGS, Permission.MANAGE_ORG_USERS], {
    mode: 'any',
    scope: 'global',
  })
  async unblockUser(
    @Param('identifier') identifier: string,
    @Body() dto: AdminUnblockUserDto,
    @Request() req: any,
  ) {
    const adminUserId = req.user.userId;
    const result = await this.adminUserService.unblockUser(
      identifier,
      adminUserId,
      dto,
    );
    return ok(result, 'User unblocked successfully');
  }
}
