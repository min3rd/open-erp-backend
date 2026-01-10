import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvitationService } from '../services/invitation.service';
import {
  CreateInvitationDto,
  AcceptInvitationDto,
} from '../dto/invitation.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Permissions } from '@shared/authz/decorators';
import { created, ok, deleted } from '@shared/response';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
  };
}

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post('organizations/:organizationId')
  @ApiOperation({ summary: 'Create invitation for organization' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully' })
  @Permissions(['invitation.create', 'organization.manage'], { mode: 'any' })
  async create(
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateInvitationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const invitation = await this.invitationService.create(
      organizationId,
      createDto.inviteeEmail,
      createDto.roles,
      req.user.userId,
      {
        scope: createDto.scope,
        message: createDto.message,
      },
    );
    return created(invitation, 'Invitation created successfully');
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  async accept(
    @Body() acceptDto: AcceptInvitationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.invitationService.accept(
      acceptDto.token,
      req.user.userId,
    );
    return ok(result, 'Invitation accepted successfully');
  }

  @Get('organizations/:organizationId')
  @ApiOperation({ summary: 'Get invitations for organization' })
  @ApiResponse({
    status: 200,
    description: 'Invitations retrieved successfully',
  })
  @Permissions('invitation.read')
  async findByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('status') status?: string,
  ) {
    const invitations = await this.invitationService.findByOrganization(
      organizationId,
      status as any,
    );
    return ok(invitations, 'Invitations retrieved successfully');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke invitation' })
  @ApiResponse({ status: 200, description: 'Invitation revoked successfully' })
  @Permissions(['invitation.revoke', 'organization.manage'], { mode: 'any' })
  async revoke(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.invitationService.revoke(id, req.user.userId);
    return deleted('Invitation revoked successfully');
  }
}
