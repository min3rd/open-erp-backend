import { Controller, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MembershipService } from '../services/membership.service';
import { UpdateMemberRolesDto } from '../dto/membership.dto';

@ApiTags('memberships')
@ApiBearerAuth()
@Controller('memberships')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('users/:userId/organizations')
  @ApiOperation({ summary: 'Get user organizations' })
  @ApiResponse({
    status: 200,
    description: 'User organizations retrieved successfully',
  })
  async getUserOrganizations(@Param('userId') userId: string) {
    return this.membershipService.getUserOrganizations(userId);
  }

  @Get('organizations/:organizationId/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiResponse({
    status: 200,
    description: 'Organization members retrieved successfully',
  })
  async getOrganizationMembers(
    @Param('organizationId') organizationId: string,
  ) {
    return this.membershipService.getOrganizationMembers(organizationId);
  }

  @Patch(':id/roles')
  @ApiOperation({ summary: 'Update member roles' })
  @ApiResponse({
    status: 200,
    description: 'Member roles updated successfully',
  })
  async updateRoles(
    @Param('id') id: string,
    @Body() updateDto: UpdateMemberRolesDto,
  ) {
    const userId = 'temp-user-id'; // Placeholder
    return this.membershipService.updateMemberRoles(
      id,
      updateDto.roles,
      userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  async removeMember(@Param('id') id: string) {
    const userId = 'temp-user-id'; // Placeholder
    return this.membershipService.removeMember(id, userId);
  }
}
