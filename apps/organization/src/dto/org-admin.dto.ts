import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MemberRole, OrganizationType } from '@shared/schemas';

/**
 * Query parameters for GET /orgs/user/:userId
 */
export class UserOrgsQueryDto {
  @ApiPropertyOptional({
    description: 'Include roles in the response',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeRoles?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include organization details in the response',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeOrgDetails?: boolean = false;
}

/**
 * Response item for user organizations
 */
export class UserOrgItemDto {
  @ApiProperty({ description: 'Organization ID' })
  orgId: string;

  @ApiPropertyOptional({ description: 'Organization code/taxId' })
  orgCode?: string;

  @ApiPropertyOptional({ description: 'Organization name' })
  orgName?: string;

  @ApiPropertyOptional({
    description: 'User roles in this organization',
    type: [String],
  })
  roles?: string[];

  @ApiPropertyOptional({
    description: 'User permissions in this organization',
    type: [String],
  })
  permissions?: string[];

  @ApiProperty({ description: 'When the user joined this organization' })
  joinedAt: Date;

  @ApiPropertyOptional({
    description: 'Additional membership metadata',
    example: { title: 'Manager', isPrimary: true },
  })
  membershipMeta?: {
    title?: string;
    isPrimary?: boolean;
  };
}

/**
 * Query parameters for GET /users/:userId/roles-permissions
 */
export class UserRolesPermissionsQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter by organization ID. If provided, returns permissions scoped to that org plus global.',
  })
  @IsOptional()
  @IsString()
  orgId?: string;
}

/**
 * Response DTO for user roles and permissions
 */
export class UserRolesPermissionsResponseDto {
  @ApiProperty({
    description: 'Global roles assigned to the user',
    type: [String],
    example: ['SUPER_ADMIN'],
  })
  globalRoles: string[];

  @ApiProperty({
    description: 'Global permissions for the user',
    type: [String],
    example: ['organization.manage_users_and_orgs', 'system.admin'],
  })
  globalPermissions: string[];

  @ApiProperty({
    description: 'Roles per organization (orgId -> roles[])',
    example: { org_123: ['ORG_ADMIN'], org_456: ['ORG_USER'] },
  })
  orgRoles: Record<string, string[]>;

  @ApiProperty({
    description: 'Permissions per organization (orgId -> permissions[])',
    example: {
      org_123: ['organization.manage_org_users', 'warehouse.manage'],
    },
  })
  orgPermissions: Record<string, string[]>;
}

/**
 * Request body for POST /orgs/:orgId/members/:userId/grant
 */
export class GrantOrgRoleDto {
  @ApiPropertyOptional({
    description: 'Roles to grant to the user in this org',
    type: [String],
    enum: MemberRole,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MemberRole, { each: true })
  roles?: MemberRole[];

  @ApiPropertyOptional({
    description: 'Permissions to grant to the user in this org',
    type: [String],
    example: ['warehouse.manage', 'inventory.read'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Override actor ID for audit purposes (optional)',
  })
  @IsOptional()
  @IsString()
  actorId?: string;
}

/**
 * Query parameters for GET /orgs (list all organizations)
 */
export class OrgsListQueryDto {
  @ApiPropertyOptional({
    description: 'Search by name or taxId',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description:
      'Sort field and order (e.g., createdAt:desc, name:asc). Default: createdAt:desc',
    example: 'createdAt:desc',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization type',
    enum: OrganizationType,
  })
  @IsOptional()
  @IsEnum(OrganizationType)
  orgType?: OrganizationType;
}

/**
 * Response DTO for grant operation
 */
export class GrantOrgRoleResponseDto {
  @ApiProperty({ description: 'Membership ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Updated roles', type: [String] })
  roles: string[];

  @ApiProperty({ description: 'Updated permissions', type: [String] })
  permissions: string[];

  @ApiProperty({ description: 'Membership status' })
  status: string;
}
