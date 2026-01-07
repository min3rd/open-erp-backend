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
import { TenantMembershipService } from '../services/tenant-membership.service';
import { 
  InviteMemberDto, 
  UpdateMembershipDto, 
  ListTenantMembersQueryDto,
  MembershipResponseDto,
} from '../dto/membership.dto';

@ApiTags('tenants')
@Controller('api/tenants')
export class TenantMembershipController {
  constructor(private readonly membershipService: TenantMembershipService) {}

  @Post(':tenantId/users')
  @ApiOperation({ summary: 'Invite/create membership for user in tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant/Organization ID' })
  @ApiResponse({ 
    status: 201, 
    description: 'User invited/added to tenant',
    type: MembershipResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or user already member' })
  async inviteMember(
    @Param('tenantId') tenantId: string,
    @Body() inviteDto: InviteMemberDto,
    // TODO: Extract from JWT/Auth context
    // @CurrentUser() currentUser: any,
  ) {
    // Temporary: Use a hardcoded inviter ID until auth is integrated
    const invitedById = 'system';
    
    const membership = await this.membershipService.inviteMember(
      tenantId,
      inviteDto,
      invitedById,
    );
    
    return {
      success: true,
      data: membership,
    };
  }

  @Get(':tenantId/users')
  @ApiOperation({ summary: 'List users in tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant/Organization ID' })
  @ApiResponse({ status: 200, description: 'Return list of tenant members' })
  async listTenantMembers(
    @Param('tenantId') tenantId: string,
    @Query() query: ListTenantMembersQueryDto,
  ) {
    const result = await this.membershipService.listTenantMembers(tenantId, query);
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

  @Get(':tenantId/users/:userId')
  @ApiOperation({ summary: 'Get membership details for a user in tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant/Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Return membership details',
    type: MembershipResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  async getMembershipDetails(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    const membership = await this.membershipService.getMembershipDetails(tenantId, userId);
    return {
      success: true,
      data: membership,
    };
  }

  @Patch(':tenantId/users/:userId')
  @ApiOperation({ summary: 'Update membership (role, status)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant/Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Membership successfully updated',
    type: MembershipResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async updateMembership(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() updateDto: UpdateMembershipDto,
    // TODO: Extract from JWT/Auth context
    // @CurrentUser() currentUser: any,
  ) {
    // Temporary: Use a hardcoded updater ID until auth is integrated
    const updatedById = 'system';
    
    const membership = await this.membershipService.updateMembership(
      tenantId,
      userId,
      updateDto,
      updatedById,
    );
    
    return {
      success: true,
      data: membership,
    };
  }

  @Delete(':tenantId/users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove/unlink user from tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant/Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User removed from tenant' })
  @ApiResponse({ status: 404, description: 'Membership not found' })
  @ApiResponse({ status: 400, description: 'Cannot remove last owner' })
  async removeMember(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    // TODO: Extract from JWT/Auth context
    // @CurrentUser() currentUser: any,
  ) {
    // Temporary: Use a hardcoded remover ID until auth is integrated
    const removedById = 'system';
    
    await this.membershipService.removeMember(tenantId, userId, removedById);
    
    return {
      success: true,
      message: 'User removed from tenant successfully',
    };
  }
}
