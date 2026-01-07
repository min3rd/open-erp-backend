import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { MemberRole, MemberStatus } from '@shared/schemas';

export class InviteMemberDto {
  @ApiProperty({ description: 'User identifier (email or username)', example: 'john@example.com' })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'Role to assign', enum: MemberRole, default: MemberRole.MEMBER })
  @IsEnum(MemberRole)
  role: MemberRole;

  @ApiPropertyOptional({ description: 'Send invitation email', default: true })
  @IsBoolean()
  @IsOptional()
  sendInviteEmail?: boolean;
}

export class UpdateMembershipDto {
  @ApiPropertyOptional({ description: 'Update role', enum: MemberRole })
  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;

  @ApiPropertyOptional({ description: 'Update status', enum: MemberStatus })
  @IsEnum(MemberStatus)
  @IsOptional()
  status?: MemberStatus;
}

export class MembershipResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty({ enum: MemberRole })
  role: MemberRole;

  @ApiProperty({ enum: MemberStatus })
  status: MemberStatus;

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
  @ApiPropertyOptional({ description: 'Filter by role', enum: MemberRole })
  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;

  @ApiPropertyOptional({ description: 'Filter by status', enum: MemberStatus })
  @IsEnum(MemberStatus)
  @IsOptional()
  status?: MemberStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  size?: number;
}

