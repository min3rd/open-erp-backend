import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export enum TenantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  BILLING = 'billing',
}

export enum MembershipStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  REVOKED = 'revoked',
}

export class InviteMemberDto {
  @ApiProperty({ description: 'User identifier (email or username)', example: 'john@example.com' })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'Role to assign', enum: TenantRole, default: TenantRole.MEMBER })
  @IsEnum(TenantRole)
  role: TenantRole;

  @ApiPropertyOptional({ description: 'Send invitation email', default: true })
  @IsBoolean()
  @IsOptional()
  sendInviteEmail?: boolean;
}

export class UpdateMembershipDto {
  @ApiPropertyOptional({ description: 'Update role', enum: TenantRole })
  @IsEnum(TenantRole)
  @IsOptional()
  role?: TenantRole;

  @ApiPropertyOptional({ description: 'Update status', enum: MembershipStatus })
  @IsEnum(MembershipStatus)
  @IsOptional()
  status?: MembershipStatus;
}

export class MembershipResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ enum: TenantRole })
  role: TenantRole;

  @ApiProperty({ enum: MembershipStatus })
  status: MembershipStatus;

  @ApiPropertyOptional()
  joinedAt?: Date;

  @ApiPropertyOptional()
  invitedAt?: Date;

  @ApiPropertyOptional()
  invitedBy?: string;

  @ApiPropertyOptional()
  revokedAt?: Date;

  @ApiPropertyOptional()
  revokedBy?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ListTenantMembersQueryDto {
  @ApiPropertyOptional({ description: 'Filter by role', enum: TenantRole })
  @IsEnum(TenantRole)
  @IsOptional()
  role?: TenantRole;

  @ApiPropertyOptional({ description: 'Filter by status', enum: MembershipStatus })
  @IsEnum(MembershipStatus)
  @IsOptional()
  status?: MembershipStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  size?: number;
}
