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
  ForbiddenException,
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
import { PermissionsGuard } from '@shared/authz';
import { Permissions } from '@shared/authz/decorators';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthorizationService } from '@shared/authz/authorization.service';

@ApiTags('user-configs')
@Controller({ path: 'users/:userId/configs', version: '1' })
@UseGuards(PermissionsGuard, ThrottlerGuard)
@ApiBearerAuth()
export class UserConfigController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authzService: AuthorizationService,
  ) {}

  // ========================================
  // User-Scoped Config Endpoints
  // ========================================

  @Post()
  @Permissions('config.write')
  @ApiOperation({
    summary: 'Create or update a user-scoped config',
    description:
      'Creates a new user-scoped config or updates existing one. Users can only manage their own configs.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
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
  async createOrUpdateUserConfig(
    @Param('userId') userId: string,
    @Body() dto: CreateConfigDto,
    @Request() req: any,
  ): Promise<ConfigResponseDto> {
    const actorId = req.user?.userId;
    await this.checkUserAccess(actorId, userId);

    const config = await this.configService.upsertUserConfig(
      userId,
      dto,
      actorId,
    );
    return this.mapToResponseDto(config);
  }

  @Get()
  @Permissions('config.read')
  @ApiOperation({
    summary: 'List all user-scoped configs',
    description:
      'Returns a list of all configurations for a specific user. Users can only view their own configs.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of configs to return (default: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user configs',
    type: [ConfigResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async listUserConfigs(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 100,
    @Request() req: any,
  ): Promise<ConfigResponseDto[]> {
    const actorId = req.user?.userId;
    await this.checkUserAccess(actorId, userId);

    const configs = await this.configService.listUserConfigs(userId, limit);
    return configs.map((config) => this.mapToResponseDto(config));
  }

  @Get(':name')
  @Permissions('config.read')
  @ApiOperation({
    summary: 'Get a user-scoped config by name',
    description:
      'Retrieves a specific user-scoped configuration by its name. Users can only view their own configs.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'name', description: 'Config name' })
  @ApiQuery({
    name: 'fallback',
    required: false,
    type: Boolean,
    description:
      'If true, falls back to global config when user config not found',
  })
  @ApiResponse({
    status: 200,
    description: 'Config retrieved successfully',
    type: ConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getUserConfig(
    @Param('userId') userId: string,
    @Param('name') name: string,
    @Query('fallback') fallback: boolean = false,
    @Request() req: any,
  ): Promise<ConfigResponseDto> {
    const actorId = req.user?.userId;
    await this.checkUserAccess(actorId, userId);

    const config = await this.configService.getUserConfig(
      userId,
      name,
      fallback,
    );
    return this.mapToResponseDto(config);
  }

  @Put(':name')
  @Permissions('config.write')
  @ApiOperation({
    summary: 'Update a user-scoped config',
    description:
      'Updates an existing user-scoped config. Users can only update their own configs.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'name', description: 'Config name' })
  @ApiResponse({
    status: 200,
    description: 'Config updated successfully',
    type: ConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateUserConfig(
    @Param('userId') userId: string,
    @Param('name') name: string,
    @Body() dto: UpdateConfigDto,
    @Request() req: any,
  ): Promise<ConfigResponseDto> {
    const actorId = req.user?.userId;
    await this.checkUserAccess(actorId, userId);

    const config = await this.configService.updateUserConfig(
      userId,
      name,
      dto,
      actorId,
    );
    return this.mapToResponseDto(config);
  }

  @Patch(':name')
  @Permissions('config.write')
  @ApiOperation({
    summary: 'Partially update a user-scoped config',
    description:
      'Partially updates an existing user-scoped config. Users can only update their own configs.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'name', description: 'Config name' })
  @ApiResponse({
    status: 200,
    description: 'Config updated successfully',
    type: ConfigResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Config not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async patchUserConfig(
    @Param('userId') userId: string,
    @Param('name') name: string,
    @Body() dto: UpdateConfigDto,
    @Request() req: any,
  ): Promise<ConfigResponseDto> {
    const actorId = req.user?.userId;
    await this.checkUserAccess(actorId, userId);

    const config = await this.configService.updateUserConfig(
      userId,
      name,
      dto,
      actorId,
    );
    return this.mapToResponseDto(config);
  }

  @Delete(':name')
  @Permissions('config.write')
  @ApiOperation({
    summary: 'Delete a user-scoped config',
    description:
      'Deletes a user-scoped configuration. Users can only delete their own configs.',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'name', description: 'Config name' })
  @ApiResponse({ status: 200, description: 'Config deleted successfully' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async deleteUserConfig(
    @Param('userId') userId: string,
    @Param('name') name: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const actorId = req.user?.userId;
    await this.checkUserAccess(actorId, userId);

    await this.configService.deleteUserConfig(userId, name, actorId);
    return { message: 'Config deleted successfully' };
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Check if the actor has access to manage user configs
   * Users can manage their own configs, or system admins can manage any
   */
  private async checkUserAccess(
    actorId: string,
    targetUserId: string,
  ): Promise<void> {
    // Allow if user is accessing their own configs
    if (actorId === targetUserId) {
      return;
    }

    // Allow if user is system admin
    const isSystemAdmin = await this.authzService.isSystemAdmin(actorId);
    if (isSystemAdmin) {
      return;
    }

    throw new ForbiddenException(
      'You can only access your own configuration settings',
    );
  }

  private mapToResponseDto(config: any): ConfigResponseDto {
    return {
      id: config._id?.toString() || config.id,
      name: config.name,
      scope: config.scope,
      data: config.data,
      description: config.description,
      version: config.version,
      ownerId: config.ownerId,
      createdBy: config.createdBy,
      updatedBy: config.updatedBy,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
