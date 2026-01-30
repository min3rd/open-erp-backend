import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ListUserAuditLogsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page (default: 20)',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search term (action type, resource, description)',
    example: 'password',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field (default: createdAt:desc)',
    example: 'createdAt:desc',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt:desc';

  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by action type',
    example: 'user.password.changed',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by resource',
    example: 'user',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'success',
    enum: ['success', 'failure', 'pending'],
  })
  @IsOptional()
  @IsEnum(['success', 'failure', 'pending'])
  status?: string;
}

export class UserAuditLogBasicDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'user.password.changed' })
  action: string;

  @ApiProperty({ example: 'user' })
  resource: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '192.168.1.1', nullable: true })
  ipAddress?: string;

  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ example: 'User password changed', nullable: true })
  description?: string;
}

export class UserAuditLogDetailDto extends UserAuditLogBasicDto {
  @ApiProperty({ 
    example: { oldEmail: 'old@example.com', newEmail: 'new@example.com' },
    nullable: true,
    description: 'Full request/change payload (sanitized if sensitive)'
  })
  payload?: any;

  @ApiProperty({ 
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    nullable: true,
    description: 'Detailed user agent string'
  })
  userAgent?: string;

  @ApiProperty({ 
    example: { requestId: 'req-123', sessionId: 'sess-456' },
    nullable: true,
    description: 'Any additional context'
  })
  metadata?: any;

  @ApiProperty({ 
    example: '507f1f77bcf86cd799439012',
    nullable: true,
    description: 'User ID who performed the action (for admin actions)'
  })
  performedBy?: string;

  @ApiProperty({ 
    example: '507f1f77bcf86cd799439011',
    description: 'User ID being audited'
  })
  userId: string;
}
