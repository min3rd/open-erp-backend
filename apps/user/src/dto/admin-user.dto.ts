import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsBoolean } from 'class-validator';

/**
 * DTO for admin password reset operation
 */
export class AdminResetPasswordDto {
  @ApiPropertyOptional({
    description:
      'New password for the user. If not provided, a strong random password will be generated.',
    example: 'NewSecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: 'Force user to change password on next login',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  forceResetOnNextLogin?: boolean;

  @ApiPropertyOptional({
    description: 'Send email notification to user with new password',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;

  @ApiPropertyOptional({
    description: 'Revoke all existing sessions after password reset',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  revokeSessions?: boolean;

  @ApiPropertyOptional({
    description: 'Reason for password reset (for audit)',
    example: 'User requested password reset',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * DTO for admin revoke sessions operation
 */
export class AdminRevokeSessionsDto {
  @ApiPropertyOptional({
    description: 'Revoke all refresh tokens',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  revokeRefreshTokens?: boolean;

  @ApiPropertyOptional({
    description: 'Revoke sessions from all devices',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  revokeAllDevices?: boolean;

  @ApiPropertyOptional({
    description: 'Reason for revoking sessions (for audit)',
    example: 'Security concern - suspicious activity detected',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * DTO for admin block user operation
 */
export class AdminBlockUserDto {
  @ApiProperty({
    description: 'Reason for blocking the user',
    example: 'Violation of terms of service',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description:
      'Soft block - prevent login but keep sessions alive for admin troubleshooting',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  softBlock?: boolean;

  @ApiPropertyOptional({
    description: 'Revoke all existing sessions when blocking',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  revokeSessions?: boolean;

  @ApiPropertyOptional({
    description: 'Send email notification to user',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;
}

/**
 * DTO for admin unblock user operation
 */
export class AdminUnblockUserDto {
  @ApiPropertyOptional({
    description: 'Reason for unblocking the user (for audit)',
    example: 'Issue resolved',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Send email notification to user',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;
}

/**
 * Response DTO for password reset operation
 */
export class AdminResetPasswordResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @ApiPropertyOptional({
    description:
      'Generated password (only returned if password was auto-generated)',
    example: 'Abc123XyzDef456!',
  })
  generatedPassword?: string;

  @ApiProperty({
    description: 'Whether email was sent',
    example: true,
  })
  emailSent: boolean;

  @ApiProperty({
    description: 'Whether sessions were revoked',
    example: true,
  })
  sessionsRevoked: boolean;

  @ApiProperty({
    description: 'New token version after password reset',
    example: 1,
  })
  tokenVersion: number;
}

/**
 * Response DTO for revoke sessions operation
 */
export class AdminRevokeSessionsResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @ApiProperty({
    description: 'Number of refresh tokens revoked',
    example: 3,
  })
  tokensRevoked: number;

  @ApiProperty({
    description: 'New token version after revocation',
    example: 2,
  })
  tokenVersion: number;
}

/**
 * Response DTO for block user operation
 */
export class AdminBlockUserResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @ApiProperty({
    description: 'When the user was blocked',
    example: '2024-01-15T10:30:00.000Z',
  })
  blockedAt: Date;

  @ApiProperty({
    description: 'Reason for blocking',
    example: 'Violation of terms of service',
  })
  reason: string;

  @ApiProperty({
    description: 'Whether email notification was sent',
    example: true,
  })
  emailSent: boolean;

  @ApiProperty({
    description: 'Whether sessions were revoked',
    example: true,
  })
  sessionsRevoked: boolean;
}

/**
 * Response DTO for unblock user operation
 */
export class AdminUnblockUserResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @ApiProperty({
    description: 'Whether email notification was sent',
    example: true,
  })
  emailSent: boolean;
}
