import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '../services/config.service';
import { CreateConfigDto } from '../dto/create-config.dto';
import { UpdateConfigDto } from '../dto/update-config.dto';
import { ConfigResponseDto } from '../dto/config-response.dto';
import { Config } from '../schemas/config.schema';
import { PermissionsGuard } from '@shared/authz';
import { Permissions, Roles } from '@shared/authz/decorators';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('configs')
@Controller({ path: 'configs', version: '1' })
@UseGuards(PermissionsGuard, ThrottlerGuard)
@ApiBearerAuth()
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  // ========================================
  // Global Config Endpoints
  // ========================================

  @Post()
  @Roles(['SYSTEM_ADMIN'])
  @ApiOperation({
    summary: 'Create or update a global config',
    description:
      'Creates a new global config or updates existing one. Only system admins can manage global configs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Config created or updated successfully',
    type: ConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or config data exceeds size limit',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createOrUpdateGlobalConfig(
    @Body() dto: CreateConfigDto,
    @Request() req: any,
  ): Promise<ConfigResponseDto> {
    const userId = req.user?.userId || 'system';
    const config = await this.configService.upsertGlobalConfig(dto, userId);
    return this.mapToResponseDto(config);
  }

  @Get()
  @Permissions('config.read')
  @ApiOperation({
    summary: 'List all global configs',
    description: 'Returns a list of all global configurations',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of configs to return (default: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of global configs',
    type: [ConfigResponseDto],
  })
  async listGlobalConfigs(
    @Query('limit') limit?: number,
  ): Promise<ConfigResponseDto[]> {
    const configs = await this.configService.listGlobalConfigs(limit);
    return configs.map((config) => this.mapToResponseDto(config));
  }

  @Get(':name')
  @Permissions('config.read')
  @ApiOperation({
    summary: 'Get a global config by name',
    description: 'Retrieves a specific global configuration by its name',
  })
  @ApiParam({ name: 'name', description: 'Config name' })
  @ApiResponse({
    status: 200,
    description: 'Config retrieved successfully',
    type: ConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  async getGlobalConfig(
    @Param('name') name: string,
  ): Promise<ConfigResponseDto> {
    const config = await this.configService.getGlobalConfig(name);
    return this.mapToResponseDto(config);
  }

  @Put(':name')
  @Roles(['SYSTEM_ADMIN'])
  @ApiOperation({
    summary: 'Update a global config',
    description:
      'Updates an existing global config. Only system admins can manage global configs.',
  })
  @ApiParam({ name: 'name', description: 'Config name' })
  @ApiResponse({
    status: 200,
    description: 'Config updated successfully',
    type: ConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateGlobalConfig(
    @Param('name') name: string,
    @Body() dto: UpdateConfigDto,
    @Request() req: any,
  ): Promise<ConfigResponseDto> {
    const userId = req.user?.userId || 'system';
    const config = await this.configService.updateGlobalConfig(
      name,
      dto,
      userId,
    );
    return this.mapToResponseDto(config);
  }

  @Patch(':name')
  @Roles(['SYSTEM_ADMIN'])
  @ApiOperation({
    summary: 'Partially update a global config',
    description:
      'Partially updates an existing global config. Only system admins can manage global configs.',
  })
  @ApiParam({ name: 'name', description: 'Config name' })
  @ApiResponse({
    status: 200,
    description: 'Config updated successfully',
    type: ConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async patchGlobalConfig(
    @Param('name') name: string,
    @Body() dto: UpdateConfigDto,
    @Request() req: any,
  ): Promise<ConfigResponseDto> {
    const userId = req.user?.userId || 'system';
    const config = await this.configService.updateGlobalConfig(
      name,
      dto,
      userId,
    );
    return this.mapToResponseDto(config);
  }

  @Delete(':name')
  @Roles(['SYSTEM_ADMIN'])
  @ApiOperation({
    summary: 'Delete a global config',
    description:
      'Deletes a global configuration. Only system admins can manage global configs.',
  })
  @ApiParam({ name: 'name', description: 'Config name' })
  @ApiResponse({ status: 200, description: 'Config deleted successfully' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async deleteGlobalConfig(
    @Param('name') name: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user?.userId || 'system';
    await this.configService.deleteGlobalConfig(name, userId);
    return { message: 'Config deleted successfully' };
  }

  // ========================================
  // Helper Methods
  // ========================================

  private mapToResponseDto(config: Config): ConfigResponseDto {
    return {
      id: (config as any)._id?.toString() || (config as any).id,
      name: config.name,
      scope: config.scope,
      data: config.data,
      description: config.description,
      version: config.version,
      ownerId: config.ownerId,
      createdBy: config.createdBy,
      updatedBy: config.updatedBy,
      createdAt: config.createdAt!,
      updatedAt: config.updatedAt!,
    };
  }
}
