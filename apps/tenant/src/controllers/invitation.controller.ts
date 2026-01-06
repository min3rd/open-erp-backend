import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
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

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post('organizations/:organizationId')
  @ApiOperation({ summary: 'Create invitation for organization' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully' })
  async create(
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateInvitationDto,
  ) {
    const userId = 'temp-user-id'; // Placeholder
    return this.invitationService.create(
      organizationId,
      createDto.inviteeEmail,
      createDto.roles,
      userId,
      {
        scope: createDto.scope,
        message: createDto.message,
      },
    );
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  async accept(@Body() acceptDto: AcceptInvitationDto) {
    const userId = 'temp-user-id'; // Placeholder
    return this.invitationService.accept(acceptDto.token, userId);
  }

  @Get('organizations/:organizationId')
  @ApiOperation({ summary: 'Get invitations for organization' })
  @ApiResponse({
    status: 200,
    description: 'Invitations retrieved successfully',
  })
  async findByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('status') status?: string,
  ) {
    return this.invitationService.findByOrganization(
      organizationId,
      status as any,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke invitation' })
  @ApiResponse({ status: 200, description: 'Invitation revoked successfully' })
  async revoke(@Param('id') id: string) {
    const userId = 'temp-user-id'; // Placeholder
    return this.invitationService.revoke(id, userId);
  }
}
