import {
  Controller,
  Get,
  Post,
  Patch,
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
import { OrganizationService } from '../services/organization.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from '../dto/organization.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  async create(
    @Body() createDto: CreateOrganizationDto,
    // TODO: Get userId from JWT token after authentication is implemented
  ) {
    const userId = 'temp-user-id'; // Placeholder
    return this.organizationService.create(createDto as any, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations' })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  async findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('country') country?: string,
  ) {
    return this.organizationService.findAll({ type, status, country });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findById(@Param('id') id: string) {
    return this.organizationService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationDto,
  ) {
    const userId = 'temp-user-id'; // Placeholder
    return this.organizationService.update(id, updateDto as any, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async delete(@Param('id') id: string) {
    const userId = 'temp-user-id'; // Placeholder
    return this.organizationService.delete(id, userId);
  }
}
