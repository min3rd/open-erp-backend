import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MembershipService } from '../services/membership.service';
import { UpdateMemberRolesDto } from '../dto/membership.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Permissions } from '@shared/authz/decorators';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
  };
}

@ApiTags('memberships')
@ApiBearerAuth()
@Controller('memberships')
@UseGuards(JwtAuthGuard)
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('users/:userId/organizations')
  @ApiOperation({ summary: 'Get user organizations' })
  @ApiResponse({
    status: 200,
    description: 'User organizations retrieved successfully',
  })
  @Permissions('membership.read')
  async getUserOrganizations(@Param('userId') userId: string) {
    return this.membershipService.getUserOrganizations(userId);
  }

  @Get('organizations/:organizationId/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiResponse({
    status: 200,
    description: 'Organization members retrieved successfully',
  })
  @Permissions('membership.read')
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
  @Permissions(['membership.update', 'organization.manage'], { mode: 'any' })
  async updateRoles(
    @Param('id') id: string,
    @Body() updateDto: UpdateMemberRolesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.membershipService.updateMemberRoles(
      id,
      updateDto.roles,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @Permissions(['membership.delete', 'organization.manage'], { mode: 'any' })
  async removeMember(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.membershipService.removeMember(id, req.user.userId);
  }
}
