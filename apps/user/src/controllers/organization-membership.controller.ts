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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrganizationMembershipService } from '../services/organization-membership.service';
import { 
  InviteMemberDto, 
  UpdateMembershipDto, 
  ListOrganizationMembersQueryDto,
  MembershipResponseDto,
} from '../dto/membership.dto';

@ApiTags('organizations')
@Controller('api/organizations')
export class OrganizationMembershipController {
  constructor(private readonly membershipService: OrganizationMembershipService) {}

  @Post(':organizationId/users')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 invites per minute per IP
  @ApiOperation({ summary: 'Invite/create membership for user in organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ 
    status: 201, 
    description: 'User invited/added to organization',
    type: MembershipResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or user already member' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async inviteMember(
    @Param('organizationId') organizationId: string,
    @Body() inviteDto: InviteMemberDto,
    // TODO: Extract from JWT/Auth context
    // @CurrentUser() currentUser: any,
  ) {
    // Temporary: Use a hardcoded inviter ID until auth is integrated
    const invitedById = 'system';
    
    const membership = await this.membershipService.inviteMember(
      organizationId,
      inviteDto,
      invitedById,
    );
    
    return {
      success: true,
      data: membership,
    };
  }

  @Get(':organizationId/users')
  @ApiOperation({ summary: 'List users in organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Return list of organization members' })
  async listOrganizationMembers(
    @Param('organizationId') organizationId: string,
    @Query() query: ListOrganizationMembersQueryDto,
  ) {
    const result = await this.membershipService.listOrganizationMembers(organizationId, query);
    return {
      success: true,
      data: result.members,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
      },
    };
  }

  @Get(':organizationId/users/:userId')
  @ApiOperation({ summary: 'Get membership details for a user in organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return membership details',
    type: MembershipResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async getMembershipDetails(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
  ) {
    const membership = await this.membershipService.getMembershipDetails(organizationId, userId);
    return {
      success: true,
      data: membership,
    };
  }

  @Patch(':organizationId/users/:userId')
  @ApiOperation({ summary: 'Update membership (role, status)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Membership successfully updated',
    type: MembershipResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async updateMembership(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Body() updateDto: UpdateMembershipDto,
    // TODO: Extract from JWT/Auth context
    // @CurrentUser() currentUser: any,
  ) {
    // Temporary: Use a hardcoded updater ID until auth is integrated
    const updatedById = 'system';
    
    const membership = await this.membershipService.updateMembership(
      organizationId,
      userId,
      updateDto,
      updatedById,
    );
    
    return {
      success: true,
      data: membership,
    };
  }

  @Delete(':organizationId/users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove/unlink user from organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User removed from organization' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  @ApiResponse({ status: 400, description: 'Cannot remove last owner' })
  async removeMember(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    // TODO: Extract from JWT/Auth context
    // @CurrentUser() currentUser: any,
  ) {
    // Temporary: Use a hardcoded remover ID until auth is integrated
    const removedById = 'system';
    
    await this.membershipService.removeMember(organizationId, userId, removedById);
    
    return {
      success: true,
      message: 'User removed from organization successfully',
    };
  }
}
