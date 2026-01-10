import {
  Controller,
  Get,
  Post,
  Patch,
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
import { OrganizationService } from '../services/organization.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from '../dto/organization.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Permissions } from '@shared/authz/decorators';
import { created, fetched, updated, deleted, ok } from '@shared/response';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
  };
}

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @Permissions('organization.create')
  async create(
    @Body() createDto: CreateOrganizationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const organization = await this.organizationService.create(
      createDto as any,
      req.user.userId,
    );
    return created(organization, 'Organization created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  @Permissions('organization.read')
  async findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    const organizations = await this.organizationService.findAll({
      type,
      status,
      country,
    });
    return ok(organizations, 'Organizations retrieved successfully');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @Permissions('organization.read')
  async findById(@Param('id') id: string) {
    const organization = await this.organizationService.findById(id);
    return fetched(organization, 'Organization retrieved successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @Permissions(['organization.update', 'organization.manage'], {
    mode: 'any',
    scope: 'organization',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.update(
      id,
      updateDto as any,
      req.user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @Permissions(['organization.delete', 'organization.manage'], {
    mode: 'any',
    scope: 'organization',
  })
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.organizationService.delete(id, req.user.userId);
  }
}
