import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserAuditService } from '../services/user-audit.service';
import { AdminUserService } from '../services/admin-user.service';
import { ListUserAuditLogsQueryDto } from '../dto/user-audit.dto';
import { JwtAuthGuard, PermissionsGuard } from '@shared/authz';
import { Permissions } from '@shared/authz/decorators';
import { Permission } from '@shared/types/permission.enum';
import { paginated, fetched, error } from '@shared/response';
import { USER_NOT_FOUND, AUDIT_LOG_NOT_FOUND } from '@shared/errors/error-codes';

/**
 * Sanitize sensitive fields from payload
 * Redacts passwords, tokens, secrets, and other sensitive data
 */
function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const sensitiveFields = [
    'password',
    'newPassword',
    'oldPassword',
    'currentPassword',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'privateKey',
    'secretKey',
    'creditCard',
    'ssn',
    'taxId',
  ];

  const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };

  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    
    // Check if field name contains sensitive keywords
    const isSensitive = sensitiveFields.some(field => 
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizePayload(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Audit Log Controller
 * Handles retrieval of user audit logs for administrators
 */
@ApiTags('admin/users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(
    private readonly userAuditService: UserAuditService,
    private readonly adminUserService: AdminUserService,
  ) {}

  @Get(':identifier/audit-logs')
  @ApiOperation({
    summary: 'List user audit logs',
    description:
      'Retrieve audit logs for a specific user. Supports pagination, search, sorting, and date filtering. ' +
      'Identifier can be user ID, username, or email.',
  })
  @ApiParam({
    name: 'identifier',
    description: 'User ID, username, or email',
    example: 'john_doe or john@example.com or 507f1f77bcf86cd799439011',
  })
  @ApiQuery({ type: ListUserAuditLogsQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of audit logs',
    schema: {
      example: {
        success: true,
        message: null,
        error: null,
        data: {
          items: [
            {
              id: '507f1f77bcf86cd799439011',
              action: 'user.password.changed',
              resource: 'user',
              timestamp: '2024-01-15T10:30:00.000Z',
              ipAddress: '192.168.1.1',
              status: 'success',
              description: 'User password changed',
            },
          ],
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5,
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
  @Permissions(
    [Permission.MANAGE_USERS_AND_ORGS, Permission.MANAGE_ORG_USERS],
    {
      mode: 'any',
      scope: 'global',
    },
  )
  async listUserAuditLogs(
    @Param('identifier') identifier: string,
    @Query() query: ListUserAuditLogsQueryDto,
  ) {
    // Find user by identifier
    const user = await this.adminUserService.findUserByIdentifier(identifier);

    if (!user) {
      throw new HttpException(
        error(USER_NOT_FOUND, 'User not found', {
          identifier,
        }),
        HttpStatus.NOT_FOUND,
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build options for repository
    const options = {
      search: query.search,
      sortBy: query.sortBy || 'createdAt:desc',
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      action: query.action as any,
      resource: query.resource,
      status: query.status,
      limit,
      skip,
    };

    // Get audit logs
    const { items, total } = await this.userAuditService.getUserAuditLogs(
      user._id.toString(),
      options,
    );

    // Transform items to basic DTO format
    const transformedItems = items.map((item) => ({
      id: item.id,
      action: item.action,
      resource: item.resource,
      timestamp: item.createdAt,
      ipAddress: item.ipAddress,
      status: item.status,
      description: item.description,
    }));

    return paginated(
      transformedItems,
      page,
      limit,
      total,
      {
        query: query.search ? { q: query.search } : undefined,
        sort: {
          by: query.sortBy?.split(':')[0] || 'createdAt',
          order: (query.sortBy?.split(':')[1] || 'desc') as 'asc' | 'desc',
        },
      },
      'User audit logs retrieved successfully',
    );
  }

  @Get('audit-logs/:id')
  @ApiOperation({
    summary: 'Get audit log detail',
    description:
      'Retrieve detailed information for a specific audit log entry. ' +
      'Includes full payload, user agent, and metadata.',
  })
  @ApiParam({
    name: 'id',
    description: 'Audit log ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed audit log information',
    schema: {
      example: {
        success: true,
        message: null,
        error: null,
        data: {
          mode: 'get',
          item: {
            id: '507f1f77bcf86cd799439011',
            action: 'user.password.changed',
            resource: 'user',
            timestamp: '2024-01-15T10:30:00.000Z',
            ipAddress: '192.168.1.1',
            status: 'success',
            description: 'User password changed',
            payload: { passwordChangedAt: '2024-01-15T10:30:00.000Z' },
            userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            metadata: { requestId: 'req-123', sessionId: 'sess-456' },
            performedBy: '507f1f77bcf86cd799439012',
            userId: '507f1f77bcf86cd799439011',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Audit log not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @Permissions(
    [Permission.MANAGE_USERS_AND_ORGS, Permission.MANAGE_ORG_USERS],
    {
      mode: 'any',
      scope: 'global',
    },
  )
  async getAuditLogDetail(@Param('id') id: string) {
    const auditLog = await this.userAuditService.getAuditLogById(id);

    if (!auditLog) {
      throw new HttpException(
        error(AUDIT_LOG_NOT_FOUND, 'Audit log not found', {
          id,
        }),
        HttpStatus.NOT_FOUND,
      );
    }

    // Transform to detailed DTO format
    const transformedLog = {
      id: auditLog.id,
      action: auditLog.action,
      resource: auditLog.resource,
      timestamp: auditLog.createdAt,
      ipAddress: auditLog.ipAddress,
      status: auditLog.status,
      description: auditLog.description,
      payload: sanitizePayload(auditLog.payload),
      userAgent: auditLog.userAgent,
      metadata:
        auditLog.metadata instanceof Map
          ? Object.fromEntries(auditLog.metadata)
          : auditLog.metadata,
      performedBy: auditLog.performedBy?.toString(),
      userId: auditLog.userId.toString(),
    };

    return fetched(transformedLog, 'Audit log retrieved successfully');
  }
}
