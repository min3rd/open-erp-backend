import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  JwtAuthGuard,
  PermissionsGuard,
  Permissions,
  CurrentUser,
} from '@shared/authz';
import type { UserContext } from '@shared/authz';
import { Permission } from '@shared/types';
import { OrganizationMembershipService } from '../services/organization-membership.service';
import {
  InviteMemberDto,
  UpdateMembershipDto,
  ListOrganizationMembersQueryDto,
  MembershipResponseDto,
} from '../dto/membership.dto';
import { created, fetched, updated, deleted, paginated } from '@shared/response';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationMembershipController {
  constructor(
    private readonly membershipService: OrganizationMembershipService,
  ) {}

  @Post(':organizationId/users')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 invites per minute per IP
  @Permissions(Permission.ORGANIZATION_INVITE)
  @ApiOperation({
    summary: 'Invite/create membership for user in organization',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 201,
    description: 'User invited/added to organization',
    type: MembershipResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or user already member',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async inviteMember(
    @Param('organizationId') organizationId: string,
    @Body() inviteDto: InviteMemberDto,
    @CurrentUser() currentUser: UserContext,
  ) {
    const invitedById = currentUser.userId;

    const membership = await this.membershipService.inviteMember(
      organizationId,
      inviteDto,
      invitedById,
    );

    return created(membership, 'User invited to organization successfully');
  }

  @Get(':organizationId/users')
  @Permissions(Permission.ORGANIZATION_READ)
  @ApiOperation({ summary: 'List users in organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Return list of organization members',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async listOrganizationMembers(
    @Param('organizationId') organizationId: string,
    @Query() query: ListOrganizationMembersQueryDto,
  ) {
    const result = await this.membershipService.listOrganizationMembers(
      organizationId,
      query,
    );
    return paginated(
      result.members,
      result.page,
      query.size || 10,
      result.total,
      undefined,
      'Organization members retrieved successfully'
    );
  }

  @Get(':organizationId/users/:userId')
  @Permissions(Permission.ORGANIZATION_READ)
  @ApiOperation({
    summary: 'Get membership details for a user in organization',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Return membership details',
    type: MembershipResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async getMembershipDetails(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
  ) {
    const membership = await this.membershipService.getMembershipDetails(
      organizationId,
      userId,
    );
    return fetched(membership, 'Membership details retrieved successfully');
  }

  @Patch(':organizationId/users/:userId')
  @Permissions(Permission.ORGANIZATION_MEMBER_UPDATE)
  @ApiOperation({ summary: 'Update membership (role, status)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Membership successfully updated',
    type: MembershipResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async updateMembership(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Body() updateDto: UpdateMembershipDto,
    @CurrentUser() currentUser: UserContext,
  ) {
    const updatedById = currentUser.userId;

    const membership = await this.membershipService.updateMembership(
      organizationId,
      userId,
      updateDto,
      updatedById,
    );

    return updated(membership, 'Membership updated successfully');
  }

  @Delete(':organizationId/users/:userId')
  @HttpCode(HttpStatus.OK)
  @Permissions(Permission.ORGANIZATION_MEMBER_REMOVE)
  @ApiOperation({ summary: 'Remove/unlink user from organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User removed from organization' })
  @ApiResponse({ status: 400, description: 'Cannot remove last owner' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async removeMember(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: UserContext,
  ) {
    const removedById = currentUser.userId;

    await this.membershipService.removeMember(
      organizationId,
      userId,
      removedById,
    );

    return deleted('User removed from organization successfully');
  }
}
